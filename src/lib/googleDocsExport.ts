// Auth (Firebase Google sign-in + tokens) is centralised in authClient.ts.
// Re-exported here for backward compatibility with existing imports.
export { googleSignIn, getAccessToken } from './authClient';

/**
 * Send a plain-text email via the Gmail API using the signed-in admin's OAuth
 * token. Used to deliver question responses to the appraiser's inbox instead of
 * an in-app portal. Requires the gmail.send scope (see authClient) and the
 * Gmail API enabled on the project. Sends from the admin's own address.
 */
export async function sendGmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<void> {
  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyText
  ].join('\r\n');
  // base64url-encode the RFC 2822 message (UTF-8 safe).
  const raw = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gmail send failed (${res.status})`);
  }
}

export interface QdtOutlineData {
  title: string;
  sections: string[];
  faqCategories: { name: string; sampleQ: string }[];
  features: { name: string; description: string }[];
}

export const QDT_OUTLINE_CONTENT: QdtOutlineData = {
  title: "True Footage UAD 3.6 Knowledge Wiki - QDT Feedback & Review Outline",
  sections: [
    "UAD 3.6 General Overview - Transition timelines, UAD 2.6 vs 3.6 core changes, joint GSE standards.",
    "Subject Property Characteristics - Itemized property inputs, kitchen/bath updates, structural attributes.",
    "Sales Comparison Approach & Grid - Grid layout expansions, matched-pair analysis, comparable selection.",
    "Data Entry & Appraisal Tools - Software integration (aCI, TOTAL, ClickFORMS), partial remodeling inputs.",
    "Building Materials & Condition Ratings - C1-C6 rating calibration, physical wear definitions, photo standards.",
    "Quality Ratings & Structural Exhibits - Q1-Q6 quality calibration, custom vs tract finish exhibits.",
    "Location & View Adjustments - Dual-factor rating (Influence + Type), transit/waterfront proximity.",
    "Form Layouts & Uniform Reporting - Dynamic form layout changes, field coordinate mapping, GSE guides."
  ],
  faqCategories: [
    {
      name: "UAD 3.6 General Overview",
      sampleQ: "What are the main differences between UAD 2.6 and UAD 3.6 standards?"
    },
    {
      name: "Data Entry into Appraisal Tools",
      sampleQ: "How do we input partial remodeling under the new kitchen data standard?"
    },
    {
      name: "Condition & Quality Rating Standards",
      sampleQ: "Can a property receive a Q4 rating with a brand-new high-grade metal roof?"
    },
    {
      name: "Location & View Adjustments",
      sampleQ: "How should we code a property backing onto a busy municipal transit line?"
    }
  ],
  features: [
    {
      name: "Google NotebookLM AI Grounding Layer",
      description: "Contextual AI assistant that strictly grounds Q&A in the active Wiki section's reference materials and Google Drive documents."
    },
    {
      name: "Google Drive Automatic Folder Sync",
      description: "Monitors and syncs Docs, Sheets, Slides, PDFs, Videos, Images, and Shortcut links from a designated Drive folder."
    },
    {
      name: "Built-in Document Viewer & Annotations",
      description: "Renders Docs, Sheets, Slides, PDFs, MP4s, and image exhibits in-app with multi-user text highlight notes."
    },
    {
      name: "Interactive FAQ & QDT Queue",
      description: "Appraisers can search FAQs by section or submit questions directly to the Quality & Development Team queue."
    },
    {
      name: "QDT Admin Console & Security",
      description: "Reorder resources, publish FAQs, track audit logs, and restrict access to authorized corporate domains (@truefootage.tech)."
    }
  ]
};

export async function createGoogleDocOutline(accessToken: string): Promise<{ documentId: string; documentUrl: string }> {
  // Step 1: Create empty document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'True Footage UAD 3.6 Knowledge Wiki - QDT Review Outline'
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Doc');
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // Step 2: Build batch update requests to insert structured content
  const textContent = `True Footage UAD 3.6 Knowledge Wiki
Quality & Development Team (QDT) Review & Input Outline

1. EXECUTIVE PURPOSE & OBJECTIVE
Provide a centralized, interactive knowledge management and AI Q&A platform for True Footage staff appraisers navigating the transition to UAD 3.6 standards.
The QDT team is requested to review the knowledge sections, FAQ categories, Google Drive sync organization, and AI grounding parameters.

2. KNOWLEDGE WIKI SECTIONS
${QDT_OUTLINE_CONTENT.sections.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}

3. WIKI FAQ CATEGORIES & BASELINE Q&A
${QDT_OUTLINE_CONTENT.faqCategories.map((c, idx) => `  ${idx + 1}. ${c.name}\n     Sample Q: "${c.sampleQ}"`).join('\n')}

4. KEY PLATFORM FEATURES & CAPABILITIES
${QDT_OUTLINE_CONTENT.features.map((f, idx) => `  ${idx + 1}. ${f.name}\n     ${f.description}`).join('\n')}

5. ACTION ITEMS FOR QDT TEAM REVIEW
  [ ] Confirm or suggest adjustments to the 8 Knowledge Wiki sections.
  [ ] Provide top priority questions for additional FAQ categories (e.g. Client Overrides, Desktop Appraisals).
  [ ] Review Google Drive folder subfolder naming alignment.
  [ ] Designate QDT reviewers for the appraiser question submission queue.
`;

  const insertRequest = {
    requests: [
      {
        insertText: {
          location: { index: 1 },
          text: textContent
        }
      }
    ]
  };

  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(insertRequest)
  });

  return { documentId, documentUrl };
}

function normalizeSectionName(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Create one Drive subfolder per CURRENT app section (passed in as sectionNames)
 * under the resource folder. Driven by the live sections — never a hardcoded
 * list — so it can't resurrect old/renamed sections. Existing folders are
 * matched by NORMALIZED name (so "Photos/Maps/Exhibits" reuses an existing
 * "Photos Maps Exhibits" instead of making a near-duplicate).
 */
export async function createDriveSectionSubfolders(
  accessToken: string,
  parentFolderId: string | undefined,
  sectionNames: string[]
): Promise<{ folderName: string; folderId: string; created: boolean; existed?: boolean; error?: string }[]> {
  const results: { folderName: string; folderId: string; created: boolean; existed?: boolean; error?: string }[] = [];
  const names = (sectionNames || []).map(n => (n || '').trim()).filter(Boolean);
  if (!names.length) return results;
  const parent = (parentFolderId || '').trim();

  // List existing subfolders once, indexed by normalized name.
  const byNorm = new Map<string, { id: string; name: string }>();
  if (parent) {
    try {
      const q = encodeURIComponent(
        `'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      );
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const d = await res.json();
        for (const f of (d.files || [])) byNorm.set(normalizeSectionName(f.name), f);
      }
    } catch { /* treat as none existing */ }
  }

  for (const name of names) {
    const norm = normalizeSectionName(name);
    const match = byNorm.get(norm);
    if (match) {
      results.push({ folderName: name, folderId: match.id, created: false, existed: true });
      continue;
    }
    const bodyData: any = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parent) bodyData.parents = [parent];
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        const data = await res.json();
        results.push({ folderName: name, folderId: data.id, created: true });
        byNorm.set(norm, { id: data.id, name }); // guard against dup section names within this run
      } else {
        const err = await res.json().catch(() => ({}));
        results.push({ folderName: name, folderId: '', created: false, error: err.error?.message || `Failed to create folder (${res.status})` });
      }
    } catch (e: any) {
      results.push({ folderName: name, folderId: '', created: false, error: e.message || 'Network error' });
    }
  }

  return results;
}
