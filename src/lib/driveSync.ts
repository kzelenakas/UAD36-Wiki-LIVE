/**
 * Live Google Drive folder sync + linked Google Sheet export.
 *
 * All calls use the signed-in admin's Google OAuth access token (from
 * authClient.googleSignIn) — no service account required. This is what makes
 * files dropped into the Drive section subfolders show up in the Wiki, and
 * source edits propagate on the next sync (issues #1, #3, #4, #5).
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface DiscoveredFile {
  driveFileId: string;
  title: string;
  resourceType: 'doc' | 'sheet' | 'slide' | 'pdf' | 'video' | 'image';
  moduleTags: string[];
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
  driveLastModified?: string;
  description?: string;
}

function mimeToType(mime: string): DiscoveredFile['resourceType'] {
  if (mime === 'application/vnd.google-apps.document') return 'doc';
  if (mime === 'application/vnd.google-apps.spreadsheet') return 'sheet';
  if (mime === 'application/vnd.google-apps.presentation') return 'slide';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'doc';
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function humanSize(bytes?: string): string | undefined {
  if (!bytes) return undefined;
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

async function driveGet(path: string, accessToken: string): Promise<any> {
  const res = await fetch(`${DRIVE_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Drive API error (${res.status})`);
  }
  return res.json();
}

/**
 * List files inside the resource folder's section subfolders, tagging each file
 * with the wiki section whose name matches its subfolder. Subfolders that don't
 * match a known section are tagged with the literal subfolder name so the admin
 * can align them.
 */
export async function scanResourceFolder(
  accessToken: string,
  rootFolderId: string,
  sectionNames: string[]
): Promise<DiscoveredFile[]> {
  if (!rootFolderId || !rootFolderId.trim()) {
    throw new Error('No Drive resource folder ID is configured.');
  }

  const commonParams =
    'supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives';

  // 1) Find section subfolders in the root.
  const folderQuery = encodeURIComponent(
    `'${rootFolderId.trim()}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const foldersRes = await driveGet(
    `/files?q=${folderQuery}&fields=files(id,name)&${commonParams}`,
    accessToken
  );
  const subfolders: { id: string; name: string }[] = foldersRes.files || [];

  const sectionByNorm = new Map(sectionNames.map((n) => [normalizeName(n), n]));
  const discovered: DiscoveredFile[] = [];

  for (const folder of subfolders) {
    const matchedSection = sectionByNorm.get(normalizeName(folder.name)) || folder.name;

    const fileQuery = encodeURIComponent(
      `'${folder.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
    );
    const filesRes = await driveGet(
      `/files?q=${fileQuery}&fields=files(id,name,mimeType,webViewLink,thumbnailLink,modifiedTime,size)&${commonParams}`,
      accessToken
    );
    for (const f of filesRes.files || []) {
      discovered.push({
        driveFileId: f.id,
        title: f.name,
        resourceType: mimeToType(f.mimeType || ''),
        moduleTags: [matchedSection],
        webViewLink: f.webViewLink,
        thumbnailLink: f.thumbnailLink,
        size: humanSize(f.size),
        driveLastModified: f.modifiedTime,
        description: `Synced from Google Drive section folder "${folder.name}".`
      });
    }
  }

  return discovered;
}

/** Build the correct embeddable preview URL for a Drive file. */
export function driveEmbedUrl(driveFileId: string, resourceType: string): string {
  if (resourceType === 'doc') return `https://docs.google.com/document/d/${driveFileId}/preview`;
  if (resourceType === 'sheet') return `https://docs.google.com/spreadsheets/d/${driveFileId}/preview`;
  if (resourceType === 'slide') return `https://docs.google.com/presentation/d/${driveFileId}/embed`;
  // pdf / image / other binary files preview through the Drive viewer.
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

/** Direct download URL for a Drive-hosted binary file. */
export function driveDownloadUrl(driveFileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

// ---------------------------------------------------------------------------
// Linked Google Sheet export (#8)
// ---------------------------------------------------------------------------

async function sheetsPost(path: string, accessToken: string, body: any): Promise<any> {
  const res = await fetch(`${SHEETS_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Sheets API error (${res.status})`);
  }
  return res.json();
}

/**
 * Create a new spreadsheet inside the resource Drive folder (via Drive API so
 * the parent is the folder), returning its id + url.
 */
async function createSheetInFolder(
  accessToken: string,
  folderId: string,
  title: string
): Promise<{ id: string; url: string }> {
  const body: any = {
    name: title,
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };
  if (folderId && folderId.trim()) body.parents = [folderId.trim()];

  const res = await fetch(
    `${DRIVE_API}/files?supportsAllDrives=true&fields=id,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Sheet (${res.status})`);
  }
  const data = await res.json();
  return { id: data.id, url: data.webViewLink || `https://docs.google.com/spreadsheets/d/${data.id}/edit` };
}

export interface LogSheetData {
  faqRows: (string | number)[][]; // includes header row
  chatRows: (string | number)[][]; // includes header row
}

/**
 * Create (or reuse) the linked log Sheet and write the FAQ + TFAN log tabs.
 * Returns the sheet id + url. Uses two tabs: "FAQ Log" and "TFAN Log".
 */
export async function exportLogSheet(
  accessToken: string,
  folderId: string,
  existingSheetId: string | undefined,
  data: LogSheetData
): Promise<{ id: string; url: string }> {
  let sheetId = existingSheetId;
  let sheetUrl = existingSheetId
    ? `https://docs.google.com/spreadsheets/d/${existingSheetId}/edit`
    : '';

  if (!sheetId) {
    const created = await createSheetInFolder(
      accessToken,
      folderId,
      'UAD 3.6 Wiki — FAQ & TFAN Logs'
    );
    sheetId = created.id;
    sheetUrl = created.url;
  }

  // Ensure both named tabs exist (rename default Sheet1 → "FAQ Log", add "TFAN Log").
  const meta = await fetch(`${SHEETS_API}/${sheetId}?fields=sheets(properties(sheetId,title))`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then((r) => r.json());

  const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties.title);
  const requests: any[] = [];

  if (!existingTitles.includes('FAQ Log')) {
    const first = meta.sheets?.[0]?.properties;
    if (first && !existingTitles.includes('TFAN Log')) {
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: first.sheetId, title: 'FAQ Log' },
          fields: 'title'
        }
      });
    } else {
      requests.push({ addSheet: { properties: { title: 'FAQ Log' } } });
    }
  }
  if (!existingTitles.includes('TFAN Log')) {
    requests.push({ addSheet: { properties: { title: 'TFAN Log' } } });
  }
  if (requests.length) {
    await sheetsPost(`/${sheetId}:batchUpdate`, accessToken, { requests });
  }

  // Clear + write values on each tab.
  const clearBody = { ranges: ["'FAQ Log'!A1:Z100000", "'TFAN Log'!A1:Z100000"] };
  await sheetsPost(`/${sheetId}/values:batchClear`, accessToken, clearBody);

  await sheetsPost(`/${sheetId}/values:batchUpdate`, accessToken, {
    valueInputOption: 'RAW',
    data: [
      { range: "'FAQ Log'!A1", majorDimension: 'ROWS', values: data.faqRows },
      { range: "'TFAN Log'!A1", majorDimension: 'ROWS', values: data.chatRows }
    ]
  });

  return { id: sheetId!, url: sheetUrl };
}
