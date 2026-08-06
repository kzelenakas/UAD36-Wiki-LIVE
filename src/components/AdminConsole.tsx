import React, { useState, useEffect } from 'react';
import { AuditLog, Resource, FAQSection, WikiSection, SystemConfig } from '../types';
import { googleSignIn, getAccessToken, createDriveSectionSubfolders } from '../lib/googleDocsExport';
import { scanResourceFolder, exportLogSheet, checkLinkHealth } from '../lib/driveSync';
import {
  Database,
  Plus,
  RefreshCw,
  Layers,
  FileText,
  Settings,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Check,
  X,
  Sliders,
  ArrowUpDown,
  FolderSync,
  Link2,
  ListOrdered,
  FolderPlus,
  ExternalLink,
  CloudDownload,
  FileSpreadsheet,
  Lock,
  Unlock,
  ShieldAlert
} from 'lucide-react';

interface AdminConsoleProps {
  auditLogs: AuditLog[];
  onRefreshData: () => void;
  userEmail: string;
  curriculumModules: (string | WikiSection)[];
  systemConfig: SystemConfig | null;
  resources: Resource[];
  faqSections: FAQSection[];
}

export default function AdminConsole({ 
  auditLogs, 
  onRefreshData, 
  userEmail,
  curriculumModules,
  systemConfig,
  resources,
  faqSections
}: AdminConsoleProps) {
  // Navigation tabs for the console
  const [activeTab, setActiveTab] = useState<'sync' | 'modules' | 'reorder' | 'config' | 'logs'>('sync');

  // Webhook Simulator State
  // Link-health check state (flags resources whose Drive source is unreachable)
  const [linkHealth, setLinkHealth] = useState<{ id: string; title: string; section: string; reachable: boolean; status: number; webViewLink?: string }[] | null>(null);
  const [linkHealthLoading, setLinkHealthLoading] = useState(false);

  // Manual Resource creator State
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<'doc' | 'sheet' | 'slide' | 'pdf' | 'video' | 'image'>('doc');
  const [manualModule, setManualModule] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualLink, setManualLink] = useState('');
  const [manualSize, setManualSize] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Curriculum Modules manager state
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [editingModuleName, setEditingModuleName] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [renamingDescValue, setRenamingDescValue] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);

  // Resource sorting state
  const [selectedReorderModule, setSelectedReorderModule] = useState('');

  // System Config state
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [notebookLmUrl, setNotebookLmUrl] = useState('');
  const [tfanResponseStyle, setTfanResponseStyle] = useState('');
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Drive subfolders creation state
  const [creatingFolders, setCreatingFolders] = useState(false);
  const [folderResults, setFolderResults] = useState<{ folderName: string; folderId: string; created: boolean; error?: string }[] | null>(null);

  // Live Google Drive sync state (#3)
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncIsError, setSyncIsError] = useState(false);

  // Linked Google Sheet export state (#8)
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
  const [sheetIsError, setSheetIsError] = useState(false);

  // Folder ID/Name protected-edit state (#6)
  const [folderEditUnlocked, setFolderEditUnlocked] = useState(false);
  const [showFolderWarning, setShowFolderWarning] = useState(false);

  const sectionNames = curriculumModules.map(m => (typeof m === 'string' ? m : m.name));

  // Ensure a Google access token, prompting sign-in if needed.
  const ensureToken = async (): Promise<string | null> => {
    let token = getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      token = authRes?.accessToken || null;
    }
    return token;
  };

  // Live sync: read the real Drive resource folder's section subfolders and
  // index/refresh every file found (#1, #3, #4, #5).
  const handleLiveSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setSyncIsError(false);
    try {
      if (!driveFolderId || !driveFolderId.trim()) {
        throw new Error('Set the Google Drive Resource Folder ID in System Config first.');
      }
      const token = await ensureToken();
      if (!token) {
        setSyncing(false);
        return; // user cancelled sign-in
      }
      const files = await scanResourceFolder(token, driveFolderId.trim(), sectionNames);
      const res = await fetch('/api/sync/drive-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncMessage(
        files.length === 0
          ? 'No files found in the section subfolders. Add files to the Drive folders, then sync again.'
          : `${data.message} (${files.length} file${files.length === 1 ? '' : 's'} scanned from Drive)`
      );
      onRefreshData();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // silently ignore cancelled sign-in
      } else {
        setSyncIsError(true);
        setSyncMessage(err.message || String(err));
      }
    } finally {
      setSyncing(false);
    }
  };

  // Create/refresh the linked Google Sheet mirroring FAQ + TFAN logs (#8).
  const handleExportSheet = async () => {
    setSheetBusy(true);
    setSheetMessage(null);
    setSheetIsError(false);
    try {
      if (!driveFolderId || !driveFolderId.trim()) {
        throw new Error('Set the Google Drive Resource Folder ID in System Config first.');
      }
      const token = await ensureToken();
      if (!token) {
        setSheetBusy(false);
        return;
      }

      // Gather the data to mirror.
      const [faqRes, chatRes] = await Promise.all([
        fetch('/api/faq/entries').then(r => r.json()),
        fetch('/api/admin/chat-logs').then(r => r.json())
      ]);
      const faqEntries = faqRes.entries || [];
      const chatLogs = chatRes.logs || [];

      const faqRows: (string | number)[][] = [
        ['FAQ ID', 'Section', 'Question', 'Answer', 'Status', 'Wiki Sections', 'Updated']
      ];
      const sectionNameById: Record<string, string> = {};
      faqSections.forEach(s => { sectionNameById[s.id] = s.name; });
      faqEntries.forEach((f: any) => {
        faqRows.push([
          f.id,
          sectionNameById[f.sectionId] || f.sectionId,
          f.question,
          f.answer,
          f.status,
          (f.moduleTags || []).join(', '),
          f.updatedAt || ''
        ]);
      });

      const chatRows: (string | number)[][] = [
        ['Timestamp', 'User', 'Email', 'Linked Section', 'Question', 'Answer Preview']
      ];
      chatLogs.forEach((c: any) => {
        chatRows.push([
          c.timestamp,
          c.userName,
          c.userEmail,
          c.section,
          c.question,
          c.answerPreview || ''
        ]);
      });

      const result = await exportLogSheet(
        token,
        driveFolderId.trim(),
        systemConfig?.logSheetId,
        { faqRows, chatRows }
      );

      await fetch('/api/config/log-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logSheetId: result.id, logSheetUrl: result.url })
      });

      setSheetMessage(`Linked Google Sheet updated: ${faqRows.length - 1} FAQs, ${chatRows.length - 1} TFAN log rows.`);
      onRefreshData();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // ignore
      } else {
        setSheetIsError(true);
        setSheetMessage(err.message || String(err));
      }
    } finally {
      setSheetBusy(false);
    }
  };

  const handleCreateDriveSubfolders = async () => {
    setCreatingFolders(true);
    setFolderResults(null);
    try {
      let token = getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }
      if (!token) {
        alert("Google authorization is required to create Drive folders. Please allow access when prompted.");
        setCreatingFolders(false);
        return;
      }
      const res = await createDriveSectionSubfolders(token, driveFolderId);
      setFolderResults(res);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        console.info('Sign-in popup closed by user.');
      } else {
        alert(`Error creating Google Drive folders: ${err.message || err}`);
      }
    } finally {
      setCreatingFolders(false);
    }
  };

  // Initialize dropdown default tags
  useEffect(() => {
    const moduleNames = curriculumModules.map(m => typeof m === 'string' ? m : m.name);
    if (moduleNames.length > 0) {
      if (!manualModule || !moduleNames.includes(manualModule)) {
        setManualModule(moduleNames[0]);
      }
      if (!selectedReorderModule || !moduleNames.includes(selectedReorderModule)) {
        setSelectedReorderModule(moduleNames[0]);
      }
    }
  }, [curriculumModules]);

  // Load configuration details
  useEffect(() => {
    if (systemConfig) {
      setDriveFolderId(systemConfig.driveFolderId || '');
      setDriveFolderName(systemConfig.driveFolderName || '');
      setNotebookLmUrl(systemConfig.notebookLmUrl || '');
      setTfanResponseStyle((systemConfig as any).tfanResponseStyle || '');
    }
  }, [systemConfig]);

  // Link-health check: verify each synced resource's Drive source is still
  // reachable by the signed-in admin. Broken links are surfaced so the owning
  // contributor can re-share/restore the source (fits the links-not-copies model).
  const handleLinkHealthCheck = async () => {
    setLinkHealthLoading(true);
    setLinkHealth(null);
    try {
      const token = await ensureToken();
      if (!token) {
        setLinkHealthLoading(false);
        return; // user cancelled sign-in
      }
      const results = await checkLinkHealth(token, resources);
      setLinkHealth(results);
    } catch (err: any) {
      alert(`Link health check failed: ${err.message || err}`);
    } finally {
      setLinkHealthLoading(false);
    }
  };

  const handleManualResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    setManualLoading(true);

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle,
          resourceType: manualType,
          moduleTags: [manualModule],
          description: manualDesc,
          webViewLink: manualLink,
          size: manualSize,
          actorEmail: userEmail
        })
      });

      if (res.ok) {
        setManualTitle('');
        setManualDesc('');
        setManualLink('');
        setManualSize('');
        onRefreshData();
        alert('Manual wiki resource registered successfully in Firestore index!');
      } else {
        const errData = await res.json();
        alert(`Error indexing: ${errData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Network Error: ${err.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  // Curriculum management handlers
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModuleError(null);
    if (!newModuleName.trim()) return;

    try {
      const res = await fetch('/api/curriculum/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newModuleName.trim(),
          description: newModuleDesc.trim(),
          actorEmail: userEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewModuleName('');
        setNewModuleDesc('');
        onRefreshData();
      } else {
        throw new Error(data.error || 'Failed to create module');
      }
    } catch (err: any) {
      setModuleError(err.message);
    }
  };

  const handleRenameModule = async (oldName: string) => {
    setModuleError(null);
    if (!renamingValue.trim()) {
      setEditingModuleName(null);
      return;
    }

    try {
      const res = await fetch('/api/curriculum/modules/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName,
          newName: renamingValue.trim(),
          description: renamingDescValue.trim(),
          actorEmail: userEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingModuleName(null);
        setRenamingValue('');
        setRenamingDescValue('');
        onRefreshData();
      } else {
        throw new Error(data.error || 'Failed to rename module');
      }
    } catch (err: any) {
      setModuleError(err.message);
    }
  };

  const handleDeleteModule = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the wiki section "${name}"? This tag will be removed from all associated resources and FAQ entries.`)) {
      return;
    }
    setModuleError(null);

    try {
      const res = await fetch('/api/curriculum/modules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, actorEmail: userEmail })
      });
      const data = await res.json();
      if (res.ok) {
        onRefreshData();
      } else {
        throw new Error(data.error || 'Failed to delete module');
      }
    } catch (err: any) {
      setModuleError(err.message);
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === curriculumModules.length - 1) return;

    setModuleError(null);
    const newModulesList = [...curriculumModules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newModulesList[index];
    newModulesList[index] = newModulesList[targetIndex];
    newModulesList[targetIndex] = temp;

    try {
      const res = await fetch('/api/curriculum/modules/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: newModulesList, actorEmail: userEmail })
      });
      if (res.ok) {
        onRefreshData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reorder modules');
      }
    } catch (err: any) {
      setModuleError(err.message);
    }
  };

  // Resource Sorting order handler
  const handleMoveResource = async (index: number, direction: 'up' | 'down', filteredResources: Resource[]) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filteredResources.length - 1) return;

    const newList = [...filteredResources];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Build the payload mapping
    const orders = newList.map((res, idx) => ({
      id: res.id,
      order: idx + 1
    }));

    try {
      const res = await fetch('/api/resources/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders, actorEmail: userEmail })
      });
      if (res.ok) {
        onRefreshData();
      } else {
        alert('Failed to save resource ordering sequence.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Config handler
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSuccess(null);

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFolderId: driveFolderId.trim(),
          driveFolderName: driveFolderName.trim(),
          notebookLmUrl: notebookLmUrl.trim(),
          tfanResponseStyle: tfanResponseStyle,
          actorEmail: userEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setConfigSuccess('System configurations updated and logged successfully!');
        setFolderEditUnlocked(false);
        onRefreshData();
        setTimeout(() => setConfigSuccess(null), 4000);
      } else {
        alert(`Error updating config: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Network error saving config: ${err.message}`);
    }
  };

  // Delete a resource with a confirm step (Resource Ordering trash button).
  const handleDeleteResource = async (res: Resource) => {
    const ok = confirm(
      `Delete "${res.title}" from the Wiki?\n\n` +
      `This removes it from the section list and cannot be undone here. ` +
      `If it's a Drive-synced file, re-syncing will re-add it unless you also remove it from the Drive folder.`
    );
    if (!ok) return;
    try {
      const r = await fetch(`/api/resources/${res.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `Delete failed (${r.status})`);
      }
      onRefreshData();
    } catch (err: any) {
      alert(`Could not delete: ${err.message || err}`);
    }
  };

  // Filter resources by currently selected module for reordering
  const reorderFilteredResources = resources
    .filter(r => r.moduleTags.includes(selectedReorderModule))
    .sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 9999;
      const orderB = b.order !== undefined ? b.order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-sans text-slate-800">
      
      {/* Header and Sub tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="h-5.5 w-5.5 text-emerald-800" />
            Compliance Wiki Admin Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system parameters, curate UAD 3.6 wiki sections, reorder directory indices, and audit actions.
          </p>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'sync' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Drive & Sync
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'modules' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Wiki Sections
          </button>
          <button
            onClick={() => setActiveTab('reorder')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'reorder' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resource Ordering
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'config' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            System Config
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'logs' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trails ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Main Console Tab Workspace */}
      <div className="w-full">
        
        {/* Tab 1: Sync and Manual Import */}
        {activeTab === 'sync' && (
          <div className="space-y-8">
            {/* PRIMARY: Live Google Drive Sync */}
            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 border-b pb-2 border-slate-100">
                <CloudDownload className="h-5 w-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-800">Sync from Google Drive</h3>
                <span className="ml-auto text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">Live</span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 mb-4">
                <p className="text-xs text-slate-700 font-semibold mb-1.5">How this works (no technical steps):</p>
                <ol className="text-[11px] text-slate-600 leading-relaxed list-decimal ml-4 space-y-0.5">
                  <li>In Google Drive, open the Wiki resource folder and its section subfolders.</li>
                  <li>Drag &amp; drop your files into the matching section subfolder (e.g. put quality docs in <span className="font-mono">/Quality Ratings</span>).</li>
                  <li>Come back here and click <span className="font-bold">Sync from Google Drive</span>. Every file is indexed into the correct Wiki section automatically.</li>
                  <li>Edited a file in Drive? Just sync again — the Wiki always reflects the current Drive version.</li>
                </ol>
                <p className="text-[10px] text-slate-500 mt-2">
                  Files must live inside the section subfolders. Use <span className="font-semibold">Wiki Sections → Auto-create subfolders</span> to set those up so their names match your sections exactly.
                </p>
              </div>

              {syncMessage && (
                <div className={`p-3.5 rounded-xl border mb-4 text-xs leading-relaxed break-words ${
                  syncIsError ? 'bg-red-50 border-red-100 text-red-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  {syncMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleLiveSync}
                disabled={syncing}
                className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {syncing ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Scanning Google Drive…</>
                ) : (
                  <><CloudDownload className="h-4 w-4" /> Sync from Google Drive</>
                )}
              </button>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                You'll be asked to authorize Google access the first time. Reads the folder set in System Config: <span className="font-mono">{driveFolderName || 'not set'}</span>.
              </p>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Live Google Drive folder view (replaces the old offline sandbox) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-2 border-b pb-2 border-slate-100">
                <div className="flex items-center gap-2">
                  <FolderSync className="h-5 w-5 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-800">Live Google Drive Folder</h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Manage the resource folder and its section subfolders directly in Google Drive — add, rename, or remove files — then click <span className="font-semibold">Sync from Google Drive</span> above; the Wiki mirrors this folder (new files added, removed files pruned, duplicates collapsed to the current version).
              </p>
              {driveFolderId ? (
                <a
                  href={`https://drive.google.com/drive/folders/${driveFolderId.trim()}?authuser=${encodeURIComponent(userEmail)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderSync className="h-4 w-4" /> Open Google Drive Folder <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Set the resource folder ID in System Configuration to open it.
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-2 leading-normal">
                Opens with your True Footage account ({userEmail}). If Drive shows a personal account, your browser's default Google account isn't your work account — switch accounts in Drive, or use a Chrome profile signed into True Footage.
              </p>
            </div>

            {/* Link Health check */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-2 border-b pb-2 border-slate-100">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-emerald-800" />
                  <h3 className="text-sm font-bold text-slate-800">Link Health</h3>
                </div>
                <button
                  onClick={handleLinkHealthCheck}
                  disabled={linkHealthLoading}
                  className="text-[11px] font-bold text-white bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${linkHealthLoading ? 'animate-spin' : ''}`} />
                  {linkHealthLoading ? 'Checking…' : 'Check links'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Verifies every linked resource still opens for you in Drive. Broken links usually mean the source doc was un-shared, moved, or deleted by its owner — fix it at the source, then re-sync.
              </p>
              {linkHealth && (() => {
                const broken = linkHealth.filter(x => !x.reachable);
                if (linkHealth.length === 0) return <p className="text-xs text-slate-400 italic">No linked Drive resources to check.</p>;
                if (broken.length === 0) return (
                  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                    <Check className="h-4 w-4" /> All {linkHealth.length} linked resources are reachable.
                  </div>
                );
                return (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> {broken.length} of {linkHealth.length} link{broken.length === 1 ? '' : 's'} broken
                    </div>
                    {broken.map(b => (
                      <div key={b.id} className="p-3 rounded-xl border border-amber-100 bg-amber-50/60 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{b.title}</p>
                          <p className="text-[10px] text-slate-500">{b.section || 'General'} · HTTP {b.status || 'error'}</p>
                        </div>
                        {b.webViewLink && (
                          <a href={b.webViewLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 shrink-0">
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Manual Resource Registrant */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2 border-b pb-2 border-slate-100">
                <Plus className="h-5 w-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-800">Add a Single Resource by Link</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Use this to add one document that lives outside the synced Drive folders (e.g. an external website, a video, or a specific shared file). Paste its share link and pick the Wiki section it belongs to. For files in your Drive folders, use <span className="font-semibold">Sync from Google Drive</span> instead.
              </p>

              <form onSubmit={handleManualResource} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resource Title</label>
                    <input
                      type="text"
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g., Quality Rating Checklist"
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-800 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Associated Wiki Section</label>
                    <select
                      value={manualModule}
                      onChange={(e) => setManualModule(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-medium"
                    >
                      {curriculumModules.map(m => {
                        const name = typeof m === 'string' ? m : m.name;
                        return <option key={name} value={name}>{name}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resource Type</label>
                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-medium"
                    >
                      <option value="doc">Document</option>
                      <option value="sheet">Spreadsheet</option>
                      <option value="slide">Presentation</option>
                      <option value="pdf">PDF File</option>
                      <option value="video">Video Player</option>
                      <option value="image">Structural Exhibit</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Embed WebView Link</label>
                    <input
                      type="url"
                      value={manualLink}
                      onChange={(e) => setManualLink(e.target.value)}
                      placeholder="e.g., https://docs.google.com/..."
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-800 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">File Size</label>
                    <input
                      type="text"
                      value={manualSize}
                      onChange={(e) => setManualSize(e.target.value)}
                      placeholder="e.g., 1.2 MB"
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-800 text-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Short Description</label>
                    <input
                      type="text"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      placeholder="Purpose or compliance notes..."
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-800 text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {manualLoading ? "Indexing..." : "Index Resource"}
                </button>
              </form>
            </div>
          </div>
          </div>
        )}

        {/* Tab 2: Wiki Sections Management */}
        {activeTab === 'modules' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2 border-b pb-2 border-slate-100 justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-800">Dynamic Wiki Sections</h3>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {curriculumModules.length} Sections
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Curate the reference structure of the UAD 3.6 Wiki. Adding, renaming, deleting, or reordering wiki sections will instantly cascade tag associations across all indexed wiki documents and active FAQs.
            </p>

            {/* Google Drive folder alignment + Auto-create subfolders (#5) */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FolderSync className="h-4 w-4 text-emerald-800" />
                  <span className="text-xs font-bold text-slate-800">Wiki Sections ↔ Google Drive Folders</span>
                </div>
                <button
                  type="button"
                  onClick={handleCreateDriveSubfolders}
                  disabled={creatingFolders}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  {creatingFolders ? (
                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating in Drive…</>
                  ) : (
                    <><FolderPlus className="h-3.5 w-3.5" /> Auto-create subfolders in Drive</>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Each Wiki section has a matching subfolder inside your Google Drive resource folder
                (<span className="font-mono">{driveFolderName || 'set this in System Config'}</span>). Staff drop files into
                a section's Drive subfolder; you then run <span className="font-semibold">Sync from Google Drive</span> and the files
                appear in that Wiki section. Click the button to create one Drive subfolder per section below — the folder names
                are matched to your section names automatically.
              </p>

              {folderResults && (
                <div className="p-3 bg-white border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <Check className="h-4 w-4 text-emerald-600" />
                      Subfolders ready in Drive
                    </div>
                    {folderResults.some(f => (f as any).fallbackToRoot) && (
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                        Some created in My Drive (folder ID not found)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] font-mono">
                    {folderResults.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-1 text-slate-700 bg-slate-50 px-2 py-1 rounded border border-emerald-100">
                        <span className="truncate" title={f.error || f.folderName}>
                          {f.created ? '✅ created' : (f as any).existed ? '↩︎ already exists' : '❌'} {f.folderName}
                        </span>
                        {f.folderId && (
                          <a
                            href={`https://drive.google.com/drive/folders/${f.folderId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:underline flex items-center gap-0.5 text-[9px] shrink-0"
                          >
                            Open <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {moduleError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl mb-4 font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {moduleError}
              </div>
            )}

            {/* Create New Module Form */}
            <form onSubmit={handleCreateModule} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="font-bold text-xs text-slate-700">Add New Wiki Section</div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="Wiki Section Name (e.g. Quality Ratings)..."
                  className="md:w-1/2 p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-800 font-medium"
                />
                <input
                  type="text"
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  placeholder="Brief Description (e.g. Q1-Q6 definitions)..."
                  className="md:w-1/2 p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-800 font-normal"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Create Section
                </button>
              </div>
            </form>

            {/* Modules List with controls */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {curriculumModules.length === 0 ? (
                <div className="text-center text-xs py-8 text-slate-400 italic font-mono">
                  No sections currently configured. Add one above.
                </div>
              ) : (
                curriculumModules.map((modItem, idx) => {
                  const secName = typeof modItem === 'string' ? modItem : modItem.name;
                  const secDesc = typeof modItem === 'string' ? '' : modItem.description;
                  const isEditing = editingModuleName === secName;

                  return (
                    <div 
                      key={secName} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-slate-200 bg-slate-50/70 rounded-xl hover:bg-slate-50 transition gap-3"
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renamingValue}
                              onChange={(e) => setRenamingValue(e.target.value)}
                              placeholder="Section Name"
                              className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-emerald-800"
                              autoFocus
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRenameModule(secName)}
                                className="p-2 bg-emerald-800 text-white rounded-lg cursor-pointer hover:bg-emerald-900"
                                title="Save Changes"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingModuleName(null)}
                                className="p-2 bg-slate-200 text-slate-600 rounded-lg cursor-pointer hover:bg-slate-300"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={renamingDescValue}
                            onChange={(e) => setRenamingDescValue(e.target.value)}
                            placeholder="Section Brief Description..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-emerald-800"
                          />
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-[10px] font-mono font-extrabold bg-emerald-50 border border-emerald-100 text-emerald-800 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 block leading-tight">{secName}</span>
                            {secDesc && (
                              <span className="text-[11px] text-slate-500 block leading-relaxed mt-0.5">{secDesc}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 self-end sm:self-center flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingModuleName(secName);
                              setRenamingValue(secName);
                              setRenamingDescValue(secDesc);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                            title="Edit Name & Description"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveModule(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 cursor-pointer transition"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveModule(idx, 'down')}
                            disabled={idx === curriculumModules.length - 1}
                            className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 cursor-pointer transition"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(secName)}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-slate-200 rounded-lg cursor-pointer transition"
                            title="Delete Section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Resource Custom Ordering */}
        {activeTab === 'reorder' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2 border-b pb-2 border-slate-100 justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-800">Wiki Directory Reordering</h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Curate the exact ordering of resources displayed inside each wiki section. Selected section resources can be sequenced up or down, instantly adjusting sorting ranks on the appraiser dashboard.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Select Wiki Section to Reorder:
              </label>
              <select
                value={selectedReorderModule}
                onChange={(e) => setSelectedReorderModule(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-semibold focus:outline-emerald-800"
              >
                {curriculumModules.map(m => {
                  const name = typeof m === 'string' ? m : m.name;
                  return <option key={name} value={name}>{name}</option>;
                })}
              </select>
            </div>

            {/* Filtered resources list to sort */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              {reorderFilteredResources.length === 0 ? (
                <div className="text-center text-xs py-12 text-slate-400 italic font-mono">
                  No published resources currently registered under this wiki section tag.
                </div>
              ) : (
                reorderFilteredResources.map((res, idx) => {
                  const currentSeq = res.order !== undefined ? res.order : 'None';
                  return (
                    <div 
                      key={res.id} 
                      className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-xl shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 mr-4">
                        <span className="text-[9px] font-bold font-mono bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                          Seq: {currentSeq}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 block truncate leading-tight">{res.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wide">{res.resourceType.toUpperCase()} • ID: {res.id.slice(0, 8)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveResource(idx, 'up', reorderFilteredResources)}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer transition border border-slate-200"
                          title="Sequence Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveResource(idx, 'down', reorderFilteredResources)}
                          disabled={idx === reorderFilteredResources.length - 1}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer transition border border-slate-200"
                          title="Sequence Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(res)}
                          className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 rounded-lg cursor-pointer transition border border-red-200 ml-1"
                          title="Delete resource"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: System Configurations */}
        {activeTab === 'config' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2 border-b pb-2 border-slate-100">
              <Settings className="h-5 w-5 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-800">System Parameters & Integrations</h3>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Configure corporate credentials for the automated Google Drive crawler and the Google NotebookLM training portal url. Audit logs will record metadata transformations.
            </p>

            {configSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl mb-5 font-semibold flex items-center gap-2">
                <Check className="h-4.5 w-4.5" />
                {configSuccess}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Protected folder link (#6) */}
              <div className={`rounded-xl border p-3.5 space-y-4 ${folderEditUnlocked ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {folderEditUnlocked ? <Unlock className="h-4 w-4 text-amber-700" /> : <Lock className="h-4 w-4 text-slate-500" />}
                    <span className="text-xs font-bold text-slate-800">Google Drive Resource Folder (protected)</span>
                  </div>
                  {folderEditUnlocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        // Re-lock and restore original values
                        if (systemConfig) {
                          setDriveFolderId(systemConfig.driveFolderId || '');
                          setDriveFolderName(systemConfig.driveFolderName || '');
                        }
                        setFolderEditUnlocked(false);
                      }}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1 cursor-pointer"
                    >
                      Cancel edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowFolderWarning(true)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 hover:text-amber-900 border border-amber-300 bg-amber-50 rounded-lg px-2.5 py-1 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" /> Edit folder link
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Resource Folder ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Database className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={!folderEditUnlocked}
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="Enter alphanumeric Google Drive folder ID..."
                      className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-800 font-mono font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    The Google Drive folder that <span className="font-semibold">Sync from Google Drive</span> reads. Changing it repoints the entire Wiki to a different folder.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Resource Folder Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FolderSync className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={!folderEditUnlocked}
                      value={driveFolderName}
                      onChange={(e) => setDriveFolderName(e.target.value)}
                      placeholder="e.g. UAD 3.6 Wiki Resources"
                      className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-800 font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* TFAN response style — freely editable (not folder-locked) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  TFAN Response Style
                </label>
                <textarea
                  rows={7}
                  value={tfanResponseStyle}
                  onChange={(e) => setTfanResponseStyle(e.target.value)}
                  placeholder="Instructions that control how the TFAN assistant answers (length, tone, citations)…"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-800 font-mono leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Controls how the TFAN assistant answers — edit for shorter/longer or a different tone. Takes effect immediately on save; no redeploy. Leave blank to restore the built-in succinct default.
                </p>
              </div>

              {/* Save System Configuration Button */}
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Save System Configuration
              </button>
            </form>

            {/* Linked Google Sheet export (#8) */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-800">Linked Google Sheet (FAQ + TFAN Logs)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Creates (or refreshes) a Google Sheet inside your resource folder with two tabs — <span className="font-semibold">FAQ Log</span> and <span className="font-semibold">TFAN Log</span> — mirroring all FAQs and every TFAN chat question for review and record-keeping.
              </p>

              {sheetMessage && (
                <div className={`p-3 rounded-xl border mb-3 text-xs leading-relaxed break-words ${
                  sheetIsError ? 'bg-red-50 border-red-100 text-red-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  {sheetMessage}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSheet}
                  disabled={sheetBusy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {sheetBusy ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Updating Sheet…</>
                  ) : (
                    <><FileSpreadsheet className="h-4 w-4" /> {systemConfig?.logSheetUrl ? 'Refresh linked Sheet' : 'Create linked Sheet'}</>
                  )}
                </button>
                {systemConfig?.logSheetUrl && (
                  <a
                    href={systemConfig.logSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Open Sheet <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {systemConfig?.logSheetUpdatedAt && (
                <p className="text-[10px] text-slate-400 mt-2">Last exported: {new Date(systemConfig.logSheetUpdatedAt).toLocaleString()}</p>
              )}
            </div>

            {/* Folder-edit warning modal (#6) */}
            {showFolderWarning && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
                  <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    <h4 className="text-sm font-extrabold">Change the Drive folder link?</h4>
                  </div>
                  <div className="p-5 space-y-3 text-sm text-slate-700">
                    <p className="leading-relaxed">
                      The Resource Folder ID and Name connect this entire Wiki to your Google Drive. Changing them will:
                    </p>
                    <ul className="list-disc ml-5 text-xs text-slate-600 space-y-1">
                      <li>Repoint <span className="font-semibold">Sync from Google Drive</span> to a different folder.</li>
                      <li>Affect where the linked Google Sheet and auto-created subfolders are placed.</li>
                      <li>Potentially disconnect previously synced files from their source.</li>
                    </ul>
                    <p className="text-xs text-slate-500">Only change this if you are intentionally moving the Wiki to a new Drive folder.</p>
                  </div>
                  <div className="px-5 pb-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFolderWarning(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFolderEditUnlocked(true); setShowFolderWarning(false); }}
                      className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer"
                    >
                      I understand — unlock editing
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Real-time Compliance Audit Logs */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-4xl mx-auto flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-800" />
                <h3 className="text-sm font-bold text-slate-800">Wiki Activity & Audit Logs</h3>
              </div>
              <span className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                SECURE COMPLIANT JOURNAL
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Every action taken by admins (content uploads, taxonomy re-linking, FAQ publications, dynamic reordering, and configurations) is securely logged below for corporate quality assurance tracking.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans">
              {auditLogs.length === 0 ? (
                <div className="text-center text-slate-400 italic text-xs py-16 font-mono">
                  No activity audit logs registered yet in Firestore.
                </div>
              ) : (
                [...auditLogs].reverse().map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="bg-slate-200 text-slate-800 text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      Actor: <span className="font-mono text-slate-800 font-bold">{log.actorEmail}</span>
                    </p>

                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Target: <span className="font-semibold text-slate-700">{log.targetType.toUpperCase()}</span> ({log.targetId})
                    </p>

                    {log.previousValue && log.newValue && (
                      <div className="mt-1.5 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[10px] text-slate-700 whitespace-pre-wrap max-h-[80px] overflow-y-auto leading-normal">
                        <div className="text-[9px] text-slate-400 border-b pb-0.5 mb-1 uppercase font-bold">Parameters Diff Log:</div>
                        <div>Old: {log.previousValue}</div>
                        <div className="mt-1">New: {log.newValue}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
