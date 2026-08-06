import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { db } from "./server/db.js"; // note: we can import directly or through path since tsx resolves types
import { requireAuth, requireAdmin, resolveUser, ALLOWED_DOMAIN, DEV_AUTH } from "./server/auth.js";

dotenv.config();

const app = express();
// Cloud Run injects PORT at runtime (defaults to 8080); never hardcode it.
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json());

/** The verified actor for an authenticated request. Falls back to a system
 *  label rather than trusting a client-supplied email (prevents audit-log
 *  spoofing). */
function actor(req: express.Request): string {
  const u = (req as any).authUser;
  return (u && u.email) || "system@truefootage.tech";
}

// Initialize the Gemini client. Two supported modes:
//   1. Vertex AI (preferred, no API key) — authenticates with the Cloud Run
//      service account (ADC). Enabled with GOOGLE_GENAI_USE_VERTEXAI=true.
//      Requires the Vertex AI API enabled on the project and the runtime SA to
//      hold roles/aiplatform.user.
//   2. AI Studio API key — fallback if GEMINI_API_KEY is set.
// If neither is configured, Q&A runs in the rich simulated mode.
const TFAN_AI_MODEL = process.env.TFAN_AI_MODEL || "gemini-2.0-flash";
let ai: GoogleGenAI | null = null;
const useVertex = (process.env.GOOGLE_GENAI_USE_VERTEXAI || "").toLowerCase() === "true";
try {
  if (useVertex) {
    const project =
      process.env.VERTEX_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      "uad-36-knowledge-base";
    const location = process.env.VERTEX_LOCATION || "us-central1";
    ai = new GoogleGenAI({ vertexai: true, project, location });
    console.log(`Gemini client initialized via Vertex AI (project=${project}, location=${location}, model=${TFAN_AI_MODEL}) — using the service account, no API key.`);
  } else if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    console.log(`Gemini client initialized via API key (model=${TFAN_AI_MODEL}).`);
  } else {
    console.log("No AI backend configured (set GOOGLE_GENAI_USE_VERTEXAI=true for Vertex, or GEMINI_API_KEY). Q&A will run in rich simulated mode.");
  }
} catch (error) {
  console.error("Failed to initialize Gemini client:", error);
  ai = null;
}

// -------------------------------------------------------------
// API ROUTES FIRST
// -------------------------------------------------------------

// Auth: verify a real Firebase Google Workspace identity (issue #2).
// The client sends the Firebase ID token as `Authorization: Bearer <token>`.
// We cryptographically verify it, confirm the Workspace domain, and derive the
// role from an explicit allowlist. No password guessing, no "admin" backdoor.
app.post("/api/auth/login", async (req, res) => {
  const user = await resolveUser(req);
  if (!user) {
    return res.status(403).json({
      error: `Access denied. Sign in with a verified @${ALLOWED_DOMAIN} Google Workspace account.`
    });
  }
  res.json({
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      domain: user.domain
    }
  });
});

// Everything below this line requires an authenticated Workspace user.
app.use("/api", requireAuth);

// Resources
app.get("/api/resources", (req, res) => {
  res.json({ resources: db.getResources() });
});

app.post("/api/resources", requireAdmin, (req, res) => {
  const { title, resourceType, moduleTags, description, driveFileId, webViewLink, size } = req.body;
  if (!title || !resourceType || !moduleTags || !moduleTags.length) {
    return res.status(400).json({ error: "Missing required resource properties (title, resourceType, moduleTags)" });
  }

  const newResource = db.createResource({
    driveFileId: driveFileId || `drive-res-${Date.now()}`,
    title,
    resourceType,
    moduleTags,
    description,
    lastSyncedRevisionId: `rev-${Math.floor(Math.random() * 9000 + 1000)}`,
    driveLastModified: new Date().toISOString(),
    publishStatus: "published",
    webViewLink: webViewLink || "https://docs.google.com/document/d/1_Preview/edit",
    size: size || "100 KB"
  }, actor(req));

  res.status(201).json({ resource: newResource });
});

app.put("/api/resources/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, resourceType, moduleTags, description, publishStatus, webViewLink, size } = req.body;

  try {
    const updated = db.updateResource(id, {
      ...(title && { title }),
      ...(resourceType && { resourceType }),
      ...(moduleTags && { moduleTags }),
      ...(description !== undefined && { description }),
      ...(publishStatus && { publishStatus }),
      ...(webViewLink && { webViewLink }),
      ...(size && { size }),
      driveLastModified: new Date().toISOString()
    }, actor(req));
    res.json({ resource: updated });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.delete("/api/resources/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.deleteResource(id, actor(req));
    res.json({ success: true });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Resources Reordering
app.put("/api/resources/reorder", requireAdmin, (req, res) => {
  const { orders } = req.body; // Array of { id, order }
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ error: "Orders array is required" });
  }
  const resources = db.updateResourcesOrder(orders, actor(req));
  res.json({ resources });
});

// FAQ Sections
app.get("/api/faq/sections", (req, res) => {
  res.json({ sections: db.getFaqSections() });
});

app.post("/api/faq/sections", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Section name is required" });
  const section = db.createFaqSection(name, actor(req));
  res.status(201).json({ section });
});

app.put("/api/faq/sections/reorder", requireAdmin, (req, res) => {
  const { orders } = req.body; // Array of { id, order }
  if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: "Orders array is required" });
  const sections = db.updateFaqSectionOrder(orders, actor(req));
  res.json({ sections });
});

app.put("/api/faq/sections/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Section name is required" });
  try {
    const section = db.updateFaqSection(id, name, actor(req));
    res.json({ section });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.delete("/api/faq/sections/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.deleteFaqSection(id, actor(req));
    res.json({ success: true });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// FAQ Entries
app.get("/api/faq/entries", (req, res) => {
  res.json({ entries: db.getFaqEntries() });
});

app.post("/api/faq/entries", requireAdmin, (req, res) => {
  const { sectionId, question, answer, status, moduleTags } = req.body;
  if (!sectionId || !question || !answer) {
    return res.status(400).json({ error: "Missing required properties (sectionId, question, answer)" });
  }
  const entry = db.createFaqEntry({
    sectionId,
    question,
    answer,
    status: status || "draft",
    moduleTags: moduleTags || []
  }, actor(req));
  res.status(201).json({ entry });
});

app.put("/api/faq/entries/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { sectionId, question, answer, status, moduleTags, note } = req.body;
  try {
    const updated = db.updateFaqEntry(id, {
      ...(sectionId && { sectionId }),
      ...(question && { question }),
      ...(answer && { answer }),
      ...(status && { status }),
      ...(moduleTags && { moduleTags })
    }, actor(req), note);
    res.json({ entry: updated });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.delete("/api/faq/entries/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.deleteFaqEntry(id, actor(req));
    res.json({ success: true });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Submitted Questions Queue (FAQ Review queue).
// Staff may submit; only admins may list/respond/promote.
app.get("/api/submitted-questions", requireAdmin, (req, res) => {
  res.json({ questions: db.getSubmittedQuestions() });
});

app.post("/api/submitted-questions", (req, res) => {
  const { question, categoryName } = req.body;
  const user = (req as any).authUser;
  if (!question) {
    return res.status(400).json({ error: "Question text is required" });
  }
  const newQ = db.createSubmittedQuestion(
    question,
    user.uid,
    user.email,
    user.displayName || "Staff Appraiser",
    categoryName
  );
  res.status(201).json({ question: newQ });
});

app.put("/api/submitted-questions/:id/respond", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { adminResponse } = req.body;
  if (!adminResponse) return res.status(400).json({ error: "Admin response is required" });
  try {
    const updated = db.respondToSubmittedQuestion(id, adminResponse, actor(req));
    res.json({ question: updated });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.put("/api/submitted-questions/:id/promote", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { sectionId } = req.body;
  if (!sectionId) return res.status(400).json({ error: "FAQ section ID is required to promote" });

  try {
    const submitted = db.getSubmittedQuestions().find(q => q.id === id);
    if (!submitted) return res.status(404).json({ error: "Submitted question not found" });

    // 1. Create FAQ Entry
    const faq = db.createFaqEntry({
      sectionId,
      question: submitted.question,
      answer: submitted.adminResponse || "This question is currently under review by our Quality team.",
      status: "draft",
      moduleTags: []
    }, actor(req));

    // 2. Mark Question as Promoted
    const updated = db.promoteToFaq(id, sectionId, faq.id, actor(req));
    res.json({ question: updated, faq });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Annotations
app.get("/api/annotations", (req, res) => {
  const { resourceId } = req.query;
  res.json({ annotations: db.getAnnotations(resourceId as string) });
});

app.post("/api/annotations", (req, res) => {
  const { resourceId, text } = req.body;
  const user = (req as any).authUser;
  if (!resourceId || !text) {
    return res.status(400).json({ error: "Missing required annotation fields" });
  }
  const annotation = db.addAnnotation(resourceId, text, user.uid, user.email, user.displayName || "Staff Appraiser");
  res.status(201).json({ annotation });
});

app.delete("/api/annotations/:id", (req, res) => {
  const { id } = req.params;
  const user = (req as any).authUser;
  try {
    db.deleteAnnotation(id, user.email, user.role === "admin");
    res.json({ success: true });
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

// System Config Endpoints
app.get("/api/config", (req, res) => {
  res.json({ config: db.getConfig() });
});

app.put("/api/config", requireAdmin, (req, res) => {
  const { driveFolderId, driveFolderName, notebookLmUrl } = req.body;
  if (!driveFolderId || !driveFolderName || !notebookLmUrl) {
    return res.status(400).json({ error: "Missing config parameters" });
  }
  const config = db.updateConfig({ driveFolderId, driveFolderName, notebookLmUrl }, actor(req));
  res.json({ config });
});

// Record the linked Google Sheet (FAQ + TFAN log export, #8).
app.put("/api/config/log-sheet", requireAdmin, (req, res) => {
  const { logSheetId, logSheetUrl } = req.body;
  if (!logSheetId || !logSheetUrl) {
    return res.status(400).json({ error: "logSheetId and logSheetUrl are required" });
  }
  const config = db.setLogSheet(logSheetId, logSheetUrl, actor(req));
  res.json({ config });
});

// Dynamic Wiki Sections Endpoints
app.get("/api/curriculum/modules", (req, res) => {
  res.json({ modules: db.getModules() });
});

app.post("/api/curriculum/modules", requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Section name is required" });
  }
  try {
    const modules = db.createModule(name.trim(), description?.trim() || '', actor(req));
    res.status(201).json({ modules });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/curriculum/modules/reorder", requireAdmin, (req, res) => {
  const { modules } = req.body;
  if (!modules || !Array.isArray(modules)) {
    return res.status(400).json({ error: "Modules list array is required" });
  }
  const updated = db.reorderModules(modules, actor(req));
  res.json({ modules: updated });
});

app.put("/api/curriculum/modules/rename", requireAdmin, (req, res) => {
  const { oldName, newName, description } = req.body;
  if (!oldName) {
    return res.status(400).json({ error: "Old section name is required" });
  }
  const nameToUse = (newName && newName.trim()) ? newName.trim() : oldName;
  try {
    const updated = db.updateModule(oldName, nameToUse, description, actor(req));
    res.json({ modules: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/curriculum/modules", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Section name is required to delete" });
  }
  try {
    const updated = db.deleteModule(name, actor(req));
    res.json({ modules: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Audit Logs (admin only)
app.get("/api/audit-logs", requireAdmin, (req, res) => {
  res.json({ logs: db.getAuditLogs() });
});

// TFAN chat logs (admin only, issue #7)
app.get("/api/admin/chat-logs", requireAdmin, (req, res) => {
  res.json({ logs: db.getChatLogs() });
});

// Simulated Drive Changes API Webhook (admin only).
// NOTE: this is a manual "add a placeholder record" sandbox. The real,
// intuitive path is the live "Sync from Google Drive" action in the Admin
// console, which reads the actual Drive folder via the signed-in admin's
// Google token. This endpoint is kept for offline testing/demos.
app.post("/api/sync/drive-trigger", requireAdmin, (req, res) => {
  const { action, title, fileType, moduleTag } = req.body;
  const email = actor(req);

  if (!action || !title) {
    return res.status(400).json({ error: "Action and file title are required for simulated webhook" });
  }

  if (action === "create" || action === "update") {
    const matchedType = fileType || "doc";
    const tags = moduleTag ? [moduleTag] : ["UAD 3.6 General Overview"];
    const ext = matchedType === "doc" ? "docx" : matchedType === "sheet" ? "xlsx" : matchedType === "slide" ? "pptx" : "pdf";
    const driveId = `drive-hook-${Math.floor(Math.random() * 900000 + 100000)}`;

    const existing = db.getResources().find(r => r.title.toLowerCase() === title.toLowerCase());

    if (existing) {
      const updated = db.updateResource(existing.id, {
        driveLastModified: new Date().toISOString(),
        lastSyncedRevisionId: `rev-hook-${Math.floor(Math.random() * 900 + 100)}`
      }, email);
      res.json({
        message: `Simulated: Google Drive updated existing file '${title}'.`,
        resource: updated
      });
    } else {
      const created = db.createResource({
        driveFileId: driveId,
        title: `${title}.${ext}`,
        resourceType: matchedType,
        moduleTags: tags,
        description: `Placeholder record added via the Drive sync sandbox for testing. Use the live "Sync from Google Drive" action to index real files.`,
        lastSyncedRevisionId: "rev-hook-100",
        driveLastModified: new Date().toISOString(),
        publishStatus: "published",
        webViewLink: `https://docs.google.com/document/d/${driveId}_Preview/edit`,
        size: "240 KB"
      }, email);
      res.json({
        message: `Simulated: registered placeholder '${title}.${ext}'.`,
        resource: created
      });
    }
  } else if (action === "delete") {
    const existing = db.getResources().find(r => r.title.toLowerCase().startsWith(title.toLowerCase()));
    if (!existing) {
      return res.status(404).json({ error: `File starting with '${title}' not found in resources to delete` });
    }
    db.deleteResource(existing.id, email);
    res.json({
      message: `Simulated: removed record '${existing.title}'.`
    });
  } else {
    res.status(400).json({ error: "Invalid webhook action (must be 'create', 'update', or 'delete')" });
  }
});

// Bulk upsert resources discovered by a live Google Drive folder scan (#3, #5).
// The client lists the folder via the Drive API using the admin's Google token,
// then posts the discovered files here to index/refresh them. Matching is by
// driveFileId so re-syncs update in place and reflect source changes.
app.post("/api/sync/drive-index", requireAdmin, (req, res) => {
  const { files } = req.body as { files: any[] };
  if (!Array.isArray(files)) {
    return res.status(400).json({ error: "files array is required" });
  }
  const email = actor(req);
  let created = 0;
  let updated = 0;

  for (const f of files) {
    if (!f || !f.driveFileId || !f.title) continue;
    const existing = db.getResource(f.driveFileId);
    const payload = {
      driveFileId: f.driveFileId,
      title: f.title,
      resourceType: f.resourceType || "doc",
      moduleTags: Array.isArray(f.moduleTags) && f.moduleTags.length ? f.moduleTags : ["UAD 3.6 General Overview"],
      description: f.description,
      driveLastModified: f.driveLastModified || new Date().toISOString(),
      publishStatus: "published" as const,
      webViewLink: f.webViewLink,
      size: f.size,
      lastSyncedRevisionId: f.lastSyncedRevisionId || `rev-${Date.now()}`
    };
    if (existing) {
      db.updateResource(existing.id, payload, email);
      updated++;
    } else {
      db.createResource(payload, email);
      created++;
    }
  }

  res.json({ message: `Drive sync complete: ${created} added, ${updated} updated.`, created, updated, resources: db.getResources() });
});

// NotebookLM Q&A Proxy Endpoint
// Queries Gemini with NotebookLM master knowledge base first, then optionally correlates with targeted section docs!
app.post("/api/notebooklm/query", async (req, res) => {
  const { moduleId, question, chatHistory, includeSectionDocs = true, activeSources } = req.body;
  const user = (req as any).authUser;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  // Log every TFAN chat entry for admin review (#7). The linked section is
  // recorded only when the user opted to include section context; otherwise
  // it is marked "General".
  const logChat = (answerText?: string) => {
    try {
      db.addChatLog({
        question,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        section: moduleId || "General",
        includeSection: !!(includeSectionDocs && moduleId),
        answerPreview: answerText ? String(answerText).slice(0, 500) : undefined
      });
    } catch (e) {
      console.error("[chat-log] failed to record TFAN entry:", e);
    }
  };

  // 1. Gather section resources & FAQs if section correlation is requested
  const sectionResources = (includeSectionDocs && moduleId)
    ? db.getResources().filter(r => r.moduleTags.includes(moduleId))
    : [];
  const relatedFaqs = (includeSectionDocs && moduleId)
    ? db.getFaqEntries().filter(f => f.status === "published" && f.moduleTags.some(t => moduleId === t))
    : [];

  // Build document contexts for Grounding Injection
  let contextText = `You are the UAD 3.6 TFAN (True Footage Appraisal Notebook) AI Assistant.
PRIMARY KNOWLEDGE SOURCES (NotebookLM Master Vault):
- Fannie Mae & Freddie Mac UAD 3.6 specifications, Appendices, and Field Layouts.
- USPAP (Uniform Standards of Professional Appraisal Practice) 2024-2025 Edition.
- Standard Real Estate Appraisal Textbooks, Valuation Principles, and FHFA Compliance Bulletins.
`;

  if (activeSources && Array.isArray(activeSources) && activeSources.length > 0) {
    contextText += `\nACTIVE SELECTED TFAN MASTER SOURCES (${activeSources.length} sources enabled):\n`;
    activeSources.slice(0, 15).forEach((src: string) => {
      contextText += `• ${src}\n`;
    });
    if (activeSources.length > 15) {
      contextText += `• ... and ${activeSources.length - 15} additional active TFAN sources.\n`;
    }
  }

  if (includeSectionDocs && moduleId) {
    contextText += `\nADDITIONAL SECTION CONTEXT (Targeted Wiki Section Documents for "${moduleId}"):\n`;
    if (sectionResources.length > 0) {
      sectionResources.forEach((r, idx) => {
        contextText += `[Section Doc #${idx + 1}] ID: ${r.id} | Title: ${r.title} | Type: ${r.resourceType} | Description: ${r.description || "N/A"}\n`;
      });
    } else {
      contextText += `(No specific local documents uploaded for section "${moduleId}" yet. Relying on Master NotebookLM knowledge base).\n`;
    }

    if (relatedFaqs.length > 0) {
      contextText += `\nTargeted Section FAQs:\n`;
      relatedFaqs.forEach((f, idx) => {
        contextText += `FAQ #${idx + 1}: Q: ${f.question} | A: ${f.answer}\n`;
      });
    }

    contextText += `
RESPONSE GUIDELINES:
1. Reference official NotebookLM sources (GSE UAD 3.6 specs, USPAP standards, appraisal textbooks) for definitions, guidelines, and rules.
2. Correlate the response directly with the active wiki section ("${moduleId}") and its specific documents listed above.
3. Provide a structured, authoritative, and helpful answer for a professional real estate appraiser.
4. Include citations linking back to referenced sources.
`;
  } else {
    contextText += `
RESPONSE GUIDELINES:
1. Ground your response in official NotebookLM sources (GSE UAD 3.6 specs, USPAP 2024-2025, and appraisal textbooks).
2. Do not restrict your answer to any single local section document. Provide a comprehensive appraisal standard answer.
3. Keep the tone professional, objective, and clear.
`;
  }

  // Try to use Gemini client
  if (ai) {
    try {
      const messages: any[] = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.forEach((msg: any) => {
          messages.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        });
      }

      messages.push({
        role: "user",
        parts: [{ text: `${contextText}\n\nUser Question: ${question}` }]
      });

      const response = await ai.models.generateContent({
        model: TFAN_AI_MODEL,
        contents: messages,
        config: {
          temperature: 0.2, // Low temperature for high precision grounding
        }
      });

      const answerText = response.text || "No response generated by the model.";
      logChat(answerText);

      // Extract citations dynamically
      const citations: any[] = [
        {
          resourceId: "notebooklm-master",
          title: "NotebookLM Master Vault (GSE / USPAP / Textbooks)",
          isMaster: true
        }
      ];

      sectionResources.forEach(r => {
        if (answerText.toLowerCase().includes(r.title.toLowerCase()) || answerText.includes(r.id)) {
          citations.push({
            resourceId: r.id,
            title: r.title,
            isMaster: false
          });
        }
      });

      return res.json({
        answer: answerText,
        citations
      });

    } catch (apiError: any) {
      console.error("Gemini API calling error:", apiError);
      return res.status(500).json({
        error: "Internal AI processing error",
        details: apiError.message
      });
    }
  } else {
    // Elegant fallback simulation if GEMINI_API_KEY is not defined yet
    const mainCitation = {
      resourceId: "notebooklm-master",
      title: "NotebookLM Master Vault (GSE / USPAP / Textbooks)",
      isMaster: true
    };

    const citationsList: any[] = [mainCitation];
    let correlatedNote = "";

    if (includeSectionDocs && sectionResources.length > 0) {
      const doc = sectionResources[0];
      citationsList.push({
        resourceId: doc.id,
        title: doc.title,
        isMaster: false
      });
      correlatedNote = `\n\n*Correlated Section Reference:* **${doc.title}** (${moduleId} Wiki)`;
    }

    const simulatedAnswer = `**[TFAN AI Q&A - NotebookLM Grounded Response]**

Based on the **NotebookLM Master Vault** (Fannie Mae/Freddie Mac GSE UAD 3.6 Specs, USPAP 2024-2025, and Valuation Textbooks):
1. **Core Specification**: Under standard UAD 3.6 requirements, fields require discrete, structured field entries rather than free-form commentary.
2. **USPAP & GSE Alignment**: Compliance mandates verifying subject and comparable ratings against standard Fannie Mae/Freddie Mac definitions and USPAP Standards 1 & 2.
3. **Application**: For questions regarding "${moduleId || 'General UAD 3.6'}", ensure all rating inputs conform to official GSE appendix guidelines.${correlatedNote}

*To activate live Gemini AI generation, add your GEMINI_API_KEY in Settings > Secrets.*`;

    logChat(simulatedAnswer);

    res.json({
      answer: simulatedAnswer,
      citations: citationsList
    });
  }
});

// -------------------------------------------------------------
// VITE OR STATIC FILE HANDLER MIDDLEWARE
// -------------------------------------------------------------
async function bootstrap() {
  // Load the data store (Firestore in prod, local file fallback in dev)
  // before serving any requests.
  await db.init();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static file delivery configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UAD 3.6 Knowledge Wiki server running on http://localhost:${PORT}`);
    console.log(`Auth: domain=@${ALLOWED_DOMAIN}, DEV_AUTH=${DEV_AUTH ? "ON (dev only)" : "off"}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap server application:", err);
});
