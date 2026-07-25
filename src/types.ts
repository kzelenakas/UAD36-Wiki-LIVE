/**
 * UAD 3.6 Knowledge Wiki - Type Definitions
 * 
 * Shared interfaces and enums for resources, FAQs, questions, annotations,
 * audit logs, and user auth roles.
 */

export type UserRole = 'staff' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  domain: string;
}

export type ResourceType = 'doc' | 'sheet' | 'slide' | 'pdf' | 'video' | 'image';

export type PublishStatus = 'draft' | 'published';

export interface Resource {
  id: string; // Document ID (usually same as driveFileId)
  driveFileId: string;
  title: string;
  resourceType: ResourceType;
  moduleTags: string[]; // Maps to UAD 3.6 wiki sections (e.g. "Section 1", "Section 2")
  description?: string;
  lastSyncedRevisionId: string;
  driveLastModified: string; // ISO string
  publishStatus: PublishStatus;
  webViewLink?: string; // URL to view in Google Drive
  thumbnailLink?: string; // Preview thumbnail if available
  size?: string; // File size string
  order?: number; // Sorting order
}

export interface FAQSection {
  id: string;
  name: string;
  order: number;
  createdBy: string;
  createdAt: string; // ISO string
}

export type FAQStatus = 'draft' | 'review' | 'published';

export interface FAQHistoryEntry {
  id: string;
  who: string;
  when: string; // ISO string
  what: string;
}

export interface FAQEntry {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  status: FAQStatus;
  moduleTags: string[]; // For surfacing "related FAQs" next to resources
  history?: FAQHistoryEntry[];
  updatedAt?: string;
}

export type QuestionStatus = 'new' | 'answered' | 'promoted';

export interface SubmittedQuestion {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  question: string;
  submittedAt: string; // ISO string
  status: QuestionStatus;
  adminResponse?: string;
  promotedToFaqId?: string;
}

export interface ResourceAnnotation {
  id: string;
  resourceId: string; // driveFileId or resource doc ID
  userId: string;
  userEmail: string;
  userName: string;
  text: string;
  createdAt: string; // ISO string
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  action: string; // e.g. "CREATE_RESOURCE", "PUBLISH_FAQ"
  targetType: 'resource' | 'faqSection' | 'faqEntry' | 'submittedQuestion' | 'taxonomy';
  targetId: string;
  timestamp: string; // ISO string
  previousValue?: string; // JSON string of old state
  newValue?: string; // JSON string of new state
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  citations?: {
    resourceId: string;
    title: string;
    snippet?: string;
  }[];
}

export interface WikiSection {
  name: string;
  description: string;
}

// Wiki Sections list for the UAD 3.6 standards
export const DEFAULT_WIKI_SECTIONS: WikiSection[] = [
  {
    name: "UAD 3.6 Crosswalk/Playbook",
    description: "UAD 2.6 vs 3.6 core changes, joint GSE standards"
  },
  {
    name: "Form Layouts & Uniform Reporting",
    description: "Dynamic form layout and flow, field mapping, GSE guides."
  },
  {
    name: "Subject Property Characteristics",
    description: "Itemized property inputs, kitchen/bath updates, structural attributes."
  },
  {
    name: "Condition Ratings",
    description: "C1-C6 3.6 ratings/definitions; Interior/Exterior reporting/reconciling, Deferred maintenance."
  },
  {
    name: "Quality Ratings",
    description: "Q1-Q6 3.6 ratings/definitions; Interior/Exterior reporting/reconciling."
  },
  {
    name: "Sketch and Finished/Unfinished reporting",
    description: "Above Grade, Below Grade, Outbuildings"
  },
  {
    name: "Sales Comparison Approach & Grid",
    description: "Grid layout expansions, matched-pair analysis, comparable selection."
  },
  {
    name: "Photos/Maps/Exhibits",
    description: "Dual-factor rating (Influence + Type), transit/waterfront proximity."
  },
  {
    name: "Total/Total Mobile",
    description: "Workflow in Total, Setup, Quicklists, Minimal Template, Troubleshooting, Photos/Exhibits"
  },
  {
    name: "TF Formfiller [Placeholder]",
    description: "Playbook and Guidance for TF-Formfiller (Coming Fall 2026)."
  }
];

