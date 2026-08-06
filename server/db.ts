import { Resource, FAQSection, FAQEntry, SubmittedQuestion, ResourceAnnotation, AuditLog, WikiSection, TfanChatLog, SystemConfig, DEFAULT_WIKI_SECTIONS } from '../src/types';
import { initStorage, loadStore, saveStore, activeBackend } from './storage';

interface DataStore {
  resources: Resource[];
  faqSections: FAQSection[];
  faqEntries: FAQEntry[];
  submittedQuestions: SubmittedQuestion[];
  annotations: ResourceAnnotation[];
  auditLogs: AuditLog[];
  chatLogs: TfanChatLog[];
  modules?: (WikiSection | string)[];
  config?: SystemConfig;
}

const DEFAULT_CONFIG: SystemConfig = {
  driveFolderId: process.env.DRIVE_FOLDER_ID || "1tf-UAD_36_Wiki_Resources_Placeholder_ID",
  driveFolderName: "UAD 3.6 Wiki Resources",
  notebookLmUrl: "https://notebooklm.google.com/notebook/12345-67890-abcdef"
};

const DEFAULT_SECTIONS: FAQSection[] = [
  {
    id: 'sec-1',
    name: 'UAD 3.6 General Overview',
    order: 1,
    createdBy: 'kevin.zelenakas@truefootage.tech',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sec-2',
    name: 'Data Entry into Appraisal Tools',
    order: 2,
    createdBy: 'kevin.zelenakas@truefootage.tech',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sec-3',
    name: 'Condition & Quality Rating Standards',
    order: 3,
    createdBy: 'kevin.zelenakas@truefootage.tech',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sec-4',
    name: 'Location & View Adjustments',
    order: 4,
    createdBy: 'kevin.zelenakas@truefootage.tech',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_FAQS: FAQEntry[] = [
  {
    id: 'faq-1',
    sectionId: 'sec-1',
    question: 'What are the main differences between UAD 2.6 and UAD 3.6 standards?',
    answer: 'UAD 3.6 transitions from rigid text abbreviations to structured, expandable data elements. Key differences include granular, itemized property condition inputs (splitting structures, roofing, kitchen, and bathroom upgrades) instead of a single generalized rating, a unified appraisal data standard across all form types, and advanced geo-coded coordinates with absolute tracking of location parameters.',
    status: 'published',
    moduleTags: ['UAD 3.6 General Overview'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq-2',
    sectionId: 'sec-2',
    question: 'How do we input partial remodeling under the new kitchen data standard?',
    answer: 'Under UAD 3.6, you must specify the level of updates for each kitchen and bath individually using three strict categories: "Not Updated", "Partially Updated" (cosmetic changes like paint/counters), or "Fully Updated" (re-wired, custom cabinetry, full layout changes). You must select the date range of the upgrade (e.g., "1-5 years ago", "6-10 years ago") and document supporting structural photos in your report.',
    status: 'published',
    moduleTags: ['Data Entry & Appraisal Tools', 'Subject Property Characteristics'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq-3',
    sectionId: 'sec-3',
    question: 'Can a property receive a Q4 rating with a brand-new high-grade metal roof?',
    answer: 'Yes. The Quality rating (Q1-Q6) refers to the overall caliber of construction, design architectural complexity, and material quality of the primary load-bearing structure. Replacing a roof on a standard builder-grade house (typical Q4) with premium metal panels improves its physical condition and utility (potentially shifting its C-rating from C4 to C3/C2), but does not alter the fundamental quality of the structural framing or architectural caliber (which remains Q4).',
    status: 'published',
    moduleTags: ['Building Materials & Condition Ratings', 'Quality Ratings & Structural Exhibits'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq-4',
    sectionId: 'sec-4',
    question: 'How should we code a property backing onto a busy municipal transit line?',
    answer: 'UAD 3.6 introduces standardized dual-factor rating inputs: Location Influence and Location Type. For a municipal transit line, code the Location Type as "Public Transportation / Rail" and specify the Location Influence as "Beneficial", "Neutral", or "Adverse" based on local market matched-pair analysis. Ensure you add corresponding annotations in your sales comparison grid.',
    status: 'published',
    moduleTags: ['Location & View Adjustments', 'Sales Comparison Approach & Grid'],
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    driveFileId: 'drive-res-1',
    title: 'UAD 3.6 Core Implementation Guide',
    resourceType: 'doc',
    moduleTags: ['UAD 3.6 General Overview', 'Form Layouts & Uniform Reporting'],
    description: 'The master reference guide for True Footage staff appraisers, detailing implementation timelines, core data expansions, and client-specific transition expectations.',
    lastSyncedRevisionId: 'rev-0921-a',
    driveLastModified: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://docs.google.com/document/d/1_UAD_36_Core_Implementation_Guide_Preview/edit?usp=sharing',
    size: '1.4 MB'
  },
  {
    id: 'res-2',
    driveFileId: 'drive-res-2',
    title: 'Condition Adjustment Calculator',
    resourceType: 'sheet',
    moduleTags: ['Building Materials & Condition Ratings', 'Data Entry & Appraisal Tools'],
    description: 'An interactive Excel spreadsheet to calculate adjusted paired-sales values based on depreciated structural assets and condition ratings (C1 through C6).',
    lastSyncedRevisionId: 'rev-0811-s',
    driveLastModified: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://docs.google.com/spreadsheets/d/1_Condition_Adjustment_Matrix_Calculations/edit?usp=sharing',
    size: '840 KB'
  },
  {
    id: 'res-3',
    driveFileId: 'drive-res-3',
    title: 'UAD 3.6 Rollout Overview Presentation',
    resourceType: 'slide',
    moduleTags: ['UAD 3.6 General Overview'],
    description: 'True Footage Quality Team training slide-deck summarizing form changes, rating standardizations, and field reporting requirements for client lenders.',
    lastSyncedRevisionId: 'rev-1004-p',
    driveLastModified: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://docs.google.com/presentation/d/1_UAD_36_Core_Training_Curriculum/edit?usp=sharing',
    size: '4.2 MB'
  },
  {
    id: 'res-4',
    driveFileId: 'drive-res-4',
    title: 'Fannie Mae appraisal form layout changes',
    resourceType: 'pdf',
    moduleTags: ['Form Layouts & Uniform Reporting', 'Sales Comparison Approach & Grid'],
    description: 'Official Fannie Mae and Freddie Mac reference PDF detailing field layout expansions, coordinates mapping, and general form modifications.',
    lastSyncedRevisionId: 'rev-2026-f',
    driveLastModified: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://www.fanniemae.com/media/document/pdf/uad-36-reporting-formats-sample.pdf',
    size: '2.8 MB'
  },
  {
    id: 'res-5',
    driveFileId: 'drive-res-5',
    title: 'Condition Ratings Field Calibration Video',
    resourceType: 'video',
    moduleTags: ['Building Materials & Condition Ratings', 'Quality Ratings & Structural Exhibits'],
    description: 'A 15-minute field video showing live inspections of three properties to calibrate rating determinations between C3 (moderate wear) and C4 (deferred maintenance).',
    lastSyncedRevisionId: 'rev-3011-v',
    driveLastModified: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder embedded video player
    size: '128 MB'
  },
  {
    id: 'res-6',
    driveFileId: 'drive-res-6',
    title: 'Q1 Custom Construction Details',
    resourceType: 'image',
    moduleTags: ['Quality Ratings & Structural Exhibits'],
    description: 'A structural exhibit illustrating Q1 luxury construction features: custom hand-carved millwork, heavy load masonry, and structural framing intricacies.',
    lastSyncedRevisionId: 'rev-4022-i',
    driveLastModified: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    size: '1.1 MB'
  },
  {
    id: 'res-7',
    driveFileId: 'drive-res-7',
    title: 'Q4 Tract Builder Finish Examples',
    resourceType: 'image',
    moduleTags: ['Quality Ratings & Structural Exhibits'],
    description: 'Visual calibration exhibit showcasing Q4 builder-grade materials: standard stock cabinetry, pre-fabricated molding, and traditional framing.',
    lastSyncedRevisionId: 'rev-4023-i',
    driveLastModified: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    publishStatus: 'published',
    webViewLink: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    size: '1.3 MB'
  }
];

class Database {
  private data: DataStore;
  private ready = false;
  // Serialise persistence so concurrent writes never clobber each other
  // (the store is written as a single document).
  private persistQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.data = {
      resources: [],
      faqSections: [],
      faqEntries: [],
      submittedQuestions: [],
      annotations: [],
      auditLogs: [],
      chatLogs: []
    };
  }

  /**
   * Loads the data store from the active backend (Firestore or local file)
   * into memory. Must be awaited once at server bootstrap before serving
   * requests. Reads then operate on the in-memory copy (fast, synchronous)
   * and writes are mirrored back to the backend in the background.
   */
  async init() {
    if (this.ready) return;
    await initStorage();

    const loaded = await loadStore();
    if (loaded && loaded.resources) {
      this.data = {
        resources: loaded.resources || [],
        faqSections: loaded.faqSections || [],
        faqEntries: loaded.faqEntries || [],
        submittedQuestions: loaded.submittedQuestions || [],
        annotations: loaded.annotations || [],
        auditLogs: loaded.auditLogs || [],
        chatLogs: loaded.chatLogs || [],
        modules: loaded.modules,
        config: loaded.config
      };
      let updated = false;
      if (!this.data.modules || this.data.modules.length === 0) {
        this.data.modules = DEFAULT_WIKI_SECTIONS;
        updated = true;
      }
      if (!this.data.config) {
        this.data.config = { ...DEFAULT_CONFIG };
        updated = true;
      }
      if (!this.data.chatLogs) {
        this.data.chatLogs = [];
        updated = true;
      }
      if (updated) this.persist();
    } else {
      // Initialize default seed data on first run
      this.data = {
        resources: DEFAULT_RESOURCES,
        faqSections: DEFAULT_SECTIONS,
        faqEntries: DEFAULT_FAQS,
        submittedQuestions: [],
        annotations: [],
        chatLogs: [],
        auditLogs: [
          {
            id: 'log-1',
            actorEmail: 'system@truefootage.tech',
            action: 'SEED_DATABASE',
            targetType: 'taxonomy',
            targetId: 'system',
            timestamp: new Date().toISOString()
          }
        ],
        modules: DEFAULT_WIKI_SECTIONS,
        config: { ...DEFAULT_CONFIG }
      };
      this.persist();
    }
    this.ready = true;
    console.log(`[db] Initialised (${activeBackend()} backend, ${this.data.resources.length} resources).`);
  }

  /**
   * Persist the current in-memory store to the backend. Serialised through a
   * promise queue so overlapping writes apply in order. Errors are logged;
   * the in-memory copy remains the source of truth for the running instance.
   */
  private persist() {
    const snapshot = JSON.parse(JSON.stringify(this.data));
    this.persistQueue = this.persistQueue
      .then(() => saveStore(snapshot))
      .catch((e) => console.error('[db] Persist failed:', e));
    return this.persistQueue;
  }

  /** Back-compat alias — existing methods call this.save(). */
  private save() {
    this.persist();
  }

  // Resources
  getResources() {
    return [...this.data.resources].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 9999;
      const orderB = b.order !== undefined ? b.order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
  }

  updateResourcesOrder(orders: { id: string, order: number }[], actorEmail: string) {
    orders.forEach(o => {
      const res = this.data.resources.find(r => r.id === o.id);
      if (res) res.order = o.order;
    });
    this.addAuditLog(actorEmail, 'REORDER_RESOURCES', 'resource', 'multiple', undefined, JSON.stringify(orders));
    this.save();
    return this.getResources();
  }

  // Dynamic Wiki Sections
  getModules(): WikiSection[] {
    if (!this.data.modules || this.data.modules.length === 0) {
      this.data.modules = DEFAULT_WIKI_SECTIONS;
      this.save();
    }
    const normalized: WikiSection[] = this.data.modules.map(item => {
      if (typeof item === 'string') {
        const found = DEFAULT_WIKI_SECTIONS.find(d => d.name.toLowerCase() === item.toLowerCase());
        return {
          name: item,
          description: found ? found.description : ''
        };
      }
      return item;
    });
    return normalized;
  }

  createModule(name: string, description: string, actorEmail: string) {
    const modules = this.getModules();
    if (modules.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Section already exists');
    }
    const newSection: WikiSection = { name, description: description || '' };
    modules.push(newSection);
    this.data.modules = modules;
    this.addAuditLog(actorEmail, 'CREATE_MODULE', 'taxonomy', name, undefined, JSON.stringify(newSection));
    this.save();
    return modules;
  }

  updateModule(oldName: string, newName: string, description: string, actorEmail: string) {
    const modules = this.getModules();
    const idx = modules.findIndex(m => m.name === oldName);
    if (idx === -1) throw new Error('Section not found');
    
    if (oldName !== newName && modules.some(m => m.name.toLowerCase() === newName.toLowerCase())) {
      throw new Error('New section name already exists');
    }

    const updatedSec: WikiSection = {
      name: newName,
      description: description !== undefined ? description : modules[idx].description
    };
    modules[idx] = updatedSec;
    this.data.modules = modules;

    if (oldName !== newName) {
      // Cascade rename to resources matching oldName
      this.data.resources.forEach(res => {
        if (res.moduleTags) {
          res.moduleTags = res.moduleTags.map(tag => tag === oldName ? newName : tag);
        }
      });

      // Cascade rename to FAQ entries matching oldName
      this.data.faqEntries.forEach(entry => {
        if (entry.moduleTags) {
          entry.moduleTags = entry.moduleTags.map(tag => tag === oldName ? newName : tag);
        }
      });
    }

    this.addAuditLog(actorEmail, 'UPDATE_MODULE', 'taxonomy', oldName, oldName, JSON.stringify(updatedSec));
    this.save();
    return modules;
  }

  reorderModules(modulesList: WikiSection[], actorEmail: string) {
    const oldVal = JSON.stringify(this.getModules());
    this.data.modules = modulesList;
    this.addAuditLog(actorEmail, 'REORDER_MODULES', 'taxonomy', 'all', oldVal, JSON.stringify(modulesList));
    this.save();
    return this.getModules();
  }

  deleteModule(name: string, actorEmail: string) {
    const modules = this.getModules();
    const idx = modules.findIndex(m => m.name === name);
    if (idx === -1) throw new Error('Section not found');
    
    modules.splice(idx, 1);
    this.data.modules = modules;

    // Remove module tag from resources
    this.data.resources.forEach(res => {
      if (res.moduleTags) {
        res.moduleTags = res.moduleTags.filter(tag => tag !== name);
      }
    });

    // Remove module tag from FAQs
    this.data.faqEntries.forEach(entry => {
      if (entry.moduleTags) {
        entry.moduleTags = entry.moduleTags.filter(tag => tag !== name);
      }
    });

    this.addAuditLog(actorEmail, 'DELETE_MODULE', 'taxonomy', name, name, undefined);
    this.save();
    return modules;
  }

  // Configuration
  getConfig(): SystemConfig {
    if (!this.data.config) {
      this.data.config = { ...DEFAULT_CONFIG };
    }
    return this.data.config;
  }

  updateConfig(config: { driveFolderId: string, driveFolderName: string, notebookLmUrl: string }, actorEmail: string) {
    const oldVal = JSON.stringify(this.data.config);
    // Preserve linked-sheet fields that aren't part of the editable config form.
    this.data.config = { ...this.getConfig(), ...config };
    this.addAuditLog(actorEmail, 'UPDATE_CONFIG', 'taxonomy', 'system-config', oldVal, JSON.stringify(this.data.config));
    this.save();
    return this.data.config;
  }

  /** Record the linked Google Sheet (FAQ + TFAN log export, #8). */
  setLogSheet(logSheetId: string, logSheetUrl: string, actorEmail: string) {
    const cfg = this.getConfig();
    cfg.logSheetId = logSheetId;
    cfg.logSheetUrl = logSheetUrl;
    cfg.logSheetUpdatedAt = new Date().toISOString();
    this.data.config = cfg;
    this.addAuditLog(actorEmail, 'SET_LOG_SHEET', 'taxonomy', 'system-config', undefined, logSheetUrl);
    this.save();
    return cfg;
  }

  // TFAN Chat Logs (#7)
  getChatLogs(): TfanChatLog[] {
    return [...this.data.chatLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addChatLog(entry: {
    question: string;
    userId: string;
    userEmail: string;
    userName: string;
    section: string;
    includeSection: boolean;
    answerPreview?: string;
  }): TfanChatLog {
    const log: TfanChatLog = {
      id: `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: entry.userId,
      userEmail: entry.userEmail,
      userName: entry.userName,
      question: entry.question,
      section: entry.includeSection && entry.section ? entry.section : 'General',
      includeSection: entry.includeSection,
      answerPreview: entry.answerPreview,
      timestamp: new Date().toISOString()
    };
    this.data.chatLogs.push(log);
    // Keep the log bounded (retain most recent 5000 entries).
    if (this.data.chatLogs.length > 5000) {
      this.data.chatLogs.splice(0, this.data.chatLogs.length - 5000);
    }
    this.save();
    return log;
  }

  getResource(id: string) {
    return this.data.resources.find(r => r.id === id || r.driveFileId === id);
  }

  createResource(resource: Omit<Resource, 'id'>, actorEmail: string) {
    const newResource: Resource = {
      ...resource,
      id: resource.driveFileId || `res-${Date.now()}`
    };
    this.data.resources.push(newResource);
    this.addAuditLog(actorEmail, 'CREATE_RESOURCE', 'resource', newResource.id, undefined, JSON.stringify(newResource));
    this.save();
    return newResource;
  }

  updateResource(id: string, resource: Partial<Resource>, actorEmail: string) {
    const idx = this.data.resources.findIndex(r => r.id === id || r.driveFileId === id);
    if (idx === -1) throw new Error('Resource not found');
    const oldVal = { ...this.data.resources[idx] };
    const newVal = { ...oldVal, ...resource };
    this.data.resources[idx] = newVal;
    this.addAuditLog(actorEmail, 'UPDATE_RESOURCE', 'resource', id, JSON.stringify(oldVal), JSON.stringify(newVal));
    this.save();
    return newVal;
  }

  deleteResource(id: string, actorEmail: string) {
    const idx = this.data.resources.findIndex(r => r.id === id || r.driveFileId === id);
    if (idx === -1) throw new Error('Resource not found');
    const oldVal = this.data.resources[idx];
    this.data.resources.splice(idx, 1);
    this.addAuditLog(actorEmail, 'DELETE_RESOURCE', 'resource', id, JSON.stringify(oldVal), undefined);
    this.save();
    return true;
  }

  // FAQ Sections
  getFaqSections() {
    return this.data.faqSections.sort((a, b) => a.order - b.order);
  }

  createFaqSection(name: string, actorEmail: string) {
    const newSec: FAQSection = {
      id: `sec-${Date.now()}`,
      name,
      order: this.data.faqSections.length + 1,
      createdBy: actorEmail,
      createdAt: new Date().toISOString()
    };
    this.data.faqSections.push(newSec);
    this.addAuditLog(actorEmail, 'CREATE_FAQ_SECTION', 'faqSection', newSec.id, undefined, JSON.stringify(newSec));
    this.save();
    return newSec;
  }

  updateFaqSectionOrder(orders: { id: string, order: number }[], actorEmail: string) {
    const oldVal = JSON.stringify(this.data.faqSections);
    orders.forEach(o => {
      const sec = this.data.faqSections.find(s => s.id === o.id);
      if (sec) sec.order = o.order;
    });
    this.addAuditLog(actorEmail, 'REORDER_FAQ_SECTIONS', 'faqSection', 'all', oldVal, JSON.stringify(this.data.faqSections));
    this.save();
    return this.getFaqSections();
  }

  updateFaqSection(id: string, name: string, actorEmail: string) {
    const sec = this.data.faqSections.find(s => s.id === id);
    if (!sec) throw new Error('FAQ section not found');
    const oldName = sec.name;
    sec.name = name;
    this.addAuditLog(actorEmail, 'UPDATE_FAQ_SECTION', 'faqSection', id, oldName, name);
    this.save();
    return sec;
  }

  deleteFaqSection(id: string, actorEmail: string) {
    const idx = this.data.faqSections.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('FAQ section not found');
    const oldVal = this.data.faqSections[idx];
    this.data.faqSections.splice(idx, 1);
    
    // Also clean up any FAQ entries in that section
    this.data.faqEntries = this.data.faqEntries.filter(entry => entry.sectionId !== id);

    this.addAuditLog(actorEmail, 'DELETE_FAQ_SECTION', 'faqSection', id, JSON.stringify(oldVal), undefined);
    this.save();
    return true;
  }

  // FAQ Entries
  getFaqEntries() {
    return this.data.faqEntries;
  }

  createFaqEntry(entry: Omit<FAQEntry, 'id'>, actorEmail: string) {
    const newEntry: FAQEntry = {
      ...entry,
      id: `faq-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: `hist-${Date.now()}`,
          who: actorEmail,
          when: new Date().toISOString(),
          what: 'Created FAQ entry'
        }
      ]
    };
    this.data.faqEntries.push(newEntry);
    this.addAuditLog(actorEmail, 'CREATE_FAQ_ENTRY', 'faqEntry', newEntry.id, undefined, JSON.stringify(newEntry));
    this.save();
    return newEntry;
  }

  updateFaqEntry(id: string, entry: Partial<FAQEntry>, actorEmail: string, note = 'Updated fields') {
    const idx = this.data.faqEntries.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('FAQ entry not found');
    const oldVal = { ...this.data.faqEntries[idx] };
    
    const updatedHistory = [...(oldVal.history || [])];
    updatedHistory.push({
      id: `hist-${Date.now()}`,
      who: actorEmail,
      when: new Date().toISOString(),
      what: note
    });

    const newVal: FAQEntry = {
      ...oldVal,
      ...entry,
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };
    this.data.faqEntries[idx] = newVal;
    this.addAuditLog(actorEmail, 'UPDATE_FAQ_ENTRY', 'faqEntry', id, JSON.stringify(oldVal), JSON.stringify(newVal));
    this.save();
    return newVal;
  }

  deleteFaqEntry(id: string, actorEmail: string) {
    const idx = this.data.faqEntries.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('FAQ entry not found');
    const oldVal = this.data.faqEntries[idx];
    this.data.faqEntries.splice(idx, 1);
    this.addAuditLog(actorEmail, 'DELETE_FAQ_ENTRY', 'faqEntry', id, JSON.stringify(oldVal), undefined);
    this.save();
    return true;
  }

  // Submitted Questions
  getSubmittedQuestions() {
    return this.data.submittedQuestions;
  }

  createSubmittedQuestion(question: string, userId: string, userEmail: string, userName: string, categoryName?: string) {
    const displayQuestion = categoryName ? `[${categoryName}] ${question}` : question;
    const newQ: SubmittedQuestion = {
      id: `sub-${Date.now()}`,
      userId,
      userEmail,
      userName,
      question: displayQuestion,
      submittedAt: new Date().toISOString(),
      status: 'new'
    };
    this.data.submittedQuestions.push(newQ);
    this.addAuditLog(userEmail, 'SUBMIT_QUESTION', 'submittedQuestion', newQ.id, undefined, JSON.stringify(newQ));
    this.save();
    return newQ;
  }

  respondToSubmittedQuestion(id: string, adminResponse: string, actorEmail: string) {
    const idx = this.data.submittedQuestions.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Question not found');
    const oldVal = { ...this.data.submittedQuestions[idx] };
    
    this.data.submittedQuestions[idx].adminResponse = adminResponse;
    this.data.submittedQuestions[idx].status = 'answered';
    
    this.addAuditLog(actorEmail, 'ANSWER_SUBMITTED_QUESTION', 'submittedQuestion', id, JSON.stringify(oldVal), JSON.stringify(this.data.submittedQuestions[idx]));
    this.save();
    return this.data.submittedQuestions[idx];
  }

  promoteToFaq(id: string, sectionId: string, promotedToFaqId: string, actorEmail: string) {
    const idx = this.data.submittedQuestions.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('Question not found');
    const oldVal = { ...this.data.submittedQuestions[idx] };
    
    this.data.submittedQuestions[idx].status = 'promoted';
    this.data.submittedQuestions[idx].promotedToFaqId = promotedToFaqId;
    
    this.addAuditLog(actorEmail, 'PROMOTE_QUESTION_TO_FAQ', 'submittedQuestion', id, JSON.stringify(oldVal), JSON.stringify(this.data.submittedQuestions[idx]));
    this.save();
    return this.data.submittedQuestions[idx];
  }

  // Annotations
  getAnnotations(resourceId?: string) {
    if (resourceId) {
      return this.data.annotations.filter(a => a.resourceId === resourceId);
    }
    return this.data.annotations;
  }

  addAnnotation(resourceId: string, text: string, userId: string, userEmail: string, userName: string) {
    const newAnn: ResourceAnnotation = {
      id: `ann-${Date.now()}`,
      resourceId,
      userId,
      userEmail,
      userName,
      text,
      createdAt: new Date().toISOString()
    };
    this.data.annotations.push(newAnn);
    this.save();
    return newAnn;
  }

  deleteAnnotation(id: string, userEmail: string, isAdmin: boolean) {
    const idx = this.data.annotations.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Annotation not found');
    const ann = this.data.annotations[idx];
    if (ann.userEmail !== userEmail && !isAdmin) {
      throw new Error('Not authorized to delete this annotation');
    }
    this.data.annotations.splice(idx, 1);
    this.save();
    return true;
  }

  // Audit Logs
  getAuditLogs() {
    return this.data.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  addAuditLog(
    actorEmail: string,
    action: string,
    targetType: AuditLog['targetType'],
    targetId: string,
    previousValue?: string,
    newValue?: string
  ) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorEmail,
      action,
      targetType,
      targetId,
      timestamp: new Date().toISOString(),
      previousValue,
      newValue
    };
    this.data.auditLogs.push(log);
    // Prune log length if extremely large to prevent disk issues (e.g., keep last 1000 logs)
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.splice(0, this.data.auditLogs.length - 1000);
    }
  }
}

export const db = new Database();
