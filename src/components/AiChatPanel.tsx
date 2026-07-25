import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Resource } from '../types';
import { 
  Send, Bot, User, Bookmark, Loader2, Minimize2, ShieldAlert, BookOpen, 
  Database, SlidersHorizontal, Search, X, CheckSquare, Square, ChevronRight, Sparkles 
} from 'lucide-react';

interface TfanSource {
  id: string;
  title: string;
  category: 'GSE Specs' | 'USPAP & Standards' | 'Appraisal Textbooks' | 'Field Layouts';
  description: string;
  enabled: boolean;
}

const DEFAULT_TFAN_SOURCES: TfanSource[] = [
  // GSE Specs (9)
  { id: 'gse-01', title: 'Fannie Mae UAD 3.6 Core Specification (v1.4)', category: 'GSE Specs', description: 'Master GSE dataset structure & business rules', enabled: true },
  { id: 'gse-02', title: 'Freddie Mac Single-Family Seller/Servicer Guide Exhibit 36', category: 'GSE Specs', description: 'Freddie Mac UAD 3.6 selling requirements', enabled: true },
  { id: 'gse-03', title: 'UAD 3.6 Appendix D1 - Subject & Comparable Data Dictionary', category: 'GSE Specs', description: 'Field-level data dictionary and enumerations', enabled: true },
  { id: 'gse-04', title: 'UAD 3.6 Appendix D2 - Field Layout & Technical Schema', category: 'GSE Specs', description: 'XML/JSON schema definitions & validation rules', enabled: true },
  { id: 'gse-05', title: 'Fannie Mae Selling Guide B4-1.3 - Appraisal Assessment', category: 'GSE Specs', description: 'GSE appraisal quality & compliance guidelines', enabled: true },
  { id: 'gse-06', title: 'Freddie Mac Bulletin 2023-18 - UAD Updates', category: 'GSE Specs', description: 'Updated dataset implementation timelines', enabled: true },
  { id: 'gse-07', title: 'Fannie Mae Announcement SEL-2024-02 - Desktop & Hybrids', category: 'GSE Specs', description: 'Desktop and hybrid appraisal requirements', enabled: true },
  { id: 'gse-08', title: 'GSE Master Appendix E - XML Output Validation Rules', category: 'GSE Specs', description: 'Technical validation and hard-stop error rules', enabled: true },
  { id: 'gse-09', title: 'Fannie Mae Appraiser Independence Safeguards (AIR 2024)', category: 'GSE Specs', description: 'AIR compliance & appraiser independence rules', enabled: true },

  // USPAP & Standards (6)
  { id: 'uspap-01', title: 'USPAP 2024-2025 Edition - Standards Rules 1 & 2', category: 'USPAP & Standards', description: 'Real property appraisal development and reporting', enabled: true },
  { id: 'uspap-02', title: 'USPAP Advisory Opinion 18 - Use of Automated Valuation Models', category: 'USPAP & Standards', description: 'AVM usage and appraiser competency rules', enabled: true },
  { id: 'uspap-03', title: 'USPAP Advisory Opinion 37 - Computer-Assisted Valuation', category: 'USPAP & Standards', description: 'Software tool reliance and verification standards', enabled: true },
  { id: 'uspap-04', title: 'FHFA Valuation Policy Bulletin - Quality & Condition Ratings', category: 'USPAP & Standards', description: 'Federal housing finance agency rating standards', enabled: true },
  { id: 'uspap-05', title: 'FHA Single Family Housing Policy Handbook 4000.1', category: 'USPAP & Standards', description: 'HUD/FHA appraisal protocol and property standards', enabled: true },
  { id: 'uspap-06', title: 'Interagency Appraisal and Evaluation Guidelines (2024)', category: 'USPAP & Standards', description: 'Federal banking agency appraisal safety standards', enabled: true },

  // Appraisal Textbooks (5)
  { id: 'textbook-01', title: 'Appraisal Institute - The Appraisal of Real Estate (15th Ed)', category: 'Appraisal Textbooks', description: 'Foundational textbook on real property valuation', enabled: true },
  { id: 'textbook-02', title: 'AI Dictionary of Real Estate Appraisal (7th Ed)', category: 'Appraisal Textbooks', description: 'Authoritative real estate appraisal terminology', enabled: true },
  { id: 'textbook-03', title: 'ANSI Z765-2021 Standard for Measuring Single-Family Buildings', category: 'Appraisal Textbooks', description: 'Standardized gross living area (GLA) measurement', enabled: true },
  { id: 'textbook-04', title: 'Valuation Principles & Market Analysis Handbook', category: 'Appraisal Textbooks', description: 'Highest & best use, paired sales analysis techniques', enabled: true },
  { id: 'textbook-05', title: 'VA Pamphlet 26-7 Chapter 10 - Appraisal Standards', category: 'Appraisal Textbooks', description: 'VA appraisal guidelines and minimum property requirements', enabled: true },

  // Field Layouts (8)
  { id: 'field-01', title: 'UAD 3.6 Appendix A - Quality Rating Definitions (Q1-Q6)', category: 'Field Layouts', description: 'Construction quality rating criteria and examples', enabled: true },
  { id: 'field-02', title: 'UAD 3.6 Appendix B - Condition Rating Definitions (C1-C6)', category: 'Field Layouts', description: 'Property condition rating criteria and deferred maintenance', enabled: true },
  { id: 'field-03', title: 'UAD 3.6 Appendix C - Location & View Rating Criteria', category: 'Field Layouts', description: 'Location, view, and external influence ratings', enabled: true },
  { id: 'field-04', title: 'UAD 3.6 Field Specification - Site & Zoning Analysis', category: 'Field Layouts', description: 'Site dimensions, zoning compliance, and utilities', enabled: true },
  { id: 'field-05', title: 'UAD 3.6 Field Specification - Improvements & GLA', category: 'Field Layouts', description: 'Above-grade vs below-grade room counts and area', enabled: true },
  { id: 'field-06', title: 'UAD 3.6 Field Specification - Comparable Sales Grid', category: 'Field Layouts', description: 'Sales comparison grid fields and adjustments', enabled: true },
  { id: 'field-07', title: 'UAD 3.6 Field Specification - Market Analysis & Neighborhood', category: 'Field Layouts', description: 'Housing supply/demand, market trend indicators', enabled: true },
  { id: 'field-08', title: 'Freddie Mac Guide Section 5601.2 - Property Inspection', category: 'Field Layouts', description: 'Physical inspection and photo documentation rules', enabled: true }
];

interface AiChatPanelProps {
  currentModuleId: string;
  onSelectResource: (resourceId: string) => void;
  resources: Resource[];
  notebookLmUrl?: string;
}

export default function AiChatPanel({ currentModuleId, onSelectResource, resources }: AiChatPanelProps) {
  const [includeSectionDocs, setIncludeSectionDocs] = useState<boolean>(true);
  const [sources, setSources] = useState<TfanSource[]>(DEFAULT_TFAN_SOURCES);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [sourceSearchQuery, setSourceSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `I am integrated with UAD 3.6 TFAN (UAD 3.6 AI/LLM)

The selected Wiki source may be included in the response by checking the box below:`,
      timestamp: new Date().toISOString()
    }
  ]);

  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: `welcome-${currentModuleId}`,
        role: 'model',
        content: `I am integrated with UAD 3.6 TFAN (UAD 3.6 AI/LLM)

The selected Wiki source may be included in the response by checking the box below:`,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [currentModuleId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const activeTfanSourceTitles = sources.filter(s => s.enabled).map(s => s.title);

    try {
      const response = await fetch('/api/notebooklm/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: currentModuleId,
          question: userMessage.content,
          includeSectionDocs,
          activeSources: activeTfanSourceTitles,
          chatHistory: messages.slice(1).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Q&A service is temporarily unavailable.");
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.answer,
        timestamp: new Date().toISOString(),
        citations: data.citations
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setError(err.message || "An error occurred while calling the AI agent.");
    } finally {
      setIsLoading(false);
    }
  };

  const moduleResourcesCount = resources.filter(r => r.moduleTags.includes(currentModuleId)).length;
  const activeSourcesCount = sources.filter(s => s.enabled).length;

  const toggleSource = (sourceId: string) => {
    setSources(prev => prev.map(s => s.id === sourceId ? { ...s, enabled: !s.enabled } : s));
  };

  const selectAllSources = (enable: boolean) => {
    setSources(prev => prev.map(s => ({ ...s, enabled: enable })));
  };

  const filteredSources = sources.filter(s => {
    const matchesCategory = activeCategoryFilter === 'All' || s.category === activeCategoryFilter;
    const matchesSearch = s.title.toLowerCase().includes(sourceSearchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(sourceSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 right-6 bg-emerald-800 text-white rounded-full p-4 shadow-2xl hover:bg-emerald-950 flex items-center gap-2 cursor-pointer z-40 transition-all duration-200 hover:scale-105"
      >
        <Bot className="h-6 w-6 animate-pulse text-emerald-300" />
        <span className="text-sm font-bold pr-1">UAD 3.6 TFAN Chat</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl h-[580px] w-full md:w-[420px] fixed bottom-6 right-6 z-40 overflow-hidden font-sans">
      {/* Primary Header */}
      <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-900/80 p-1.5 rounded-xl border border-emerald-700/60">
            <Bot className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold tracking-wide uppercase">
              UAD 3.6 TFAN Assistant
            </h3>
            <p className="text-[10px] text-emerald-200 font-mono flex items-center gap-1">
              <Database className="h-2.5 w-2.5 text-emerald-300" />
              NotebookLM Source Grounding
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(true)}
            title="Minimize"
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/80 rounded-lg transition cursor-pointer"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TFAN Source Files Count & Customization Trigger */}
      <div className="bg-emerald-950 text-emerald-100 px-3 py-2 border-b border-emerald-900 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
          <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
            TFAN Source Files:
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsSourceModalOpen(true)}
          className="flex items-center gap-1.5 font-mono text-[10px] bg-emerald-900 hover:bg-emerald-800 text-emerald-200 px-2 py-1 rounded-md border border-emerald-700/80 font-bold transition cursor-pointer"
          title="Filter and customize active NotebookLM source documents"
        >
          <SlidersHorizontal className="h-3 w-3 text-emerald-300" />
          <span>{activeSourcesCount} Active Sources</span>
          <ChevronRight className="h-3 w-3 text-emerald-400" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/60">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs ${
              msg.role === 'user'
                ? 'bg-emerald-800 text-white rounded-br-none shadow-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs'
            }`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                {msg.role === 'user' ? (
                  <>
                    <span className="text-[10px] font-bold tracking-wide uppercase opacity-75">You</span>
                    <User className="h-3 w-3 text-emerald-300" />
                  </>
                ) : (
                  <>
                    <Bot className="h-3.5 w-3.5 text-emerald-800" />
                    <span className="text-[10px] font-extrabold tracking-wide uppercase text-emerald-900">UAD 3.6 TFAN AI</span>
                  </>
                )}
              </div>
              
              <div className="prose prose-xs leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                {msg.content}
              </div>

              {/* Grounding Sources Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Verified Sources:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {msg.citations.map((cit, idx) => {
                      if (cit.isMaster || cit.resourceId === 'notebooklm-master') {
                        return (
                          <div
                            key={`master-${idx}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5"
                            title="Primary GSE / USPAP / Textbook Knowledge Base"
                          >
                            <Sparkles className="h-3 w-3 text-amber-600 flex-shrink-0" />
                            <span>NotebookLM Master Vault ({activeSourcesCount} Sources)</span>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={cit.resourceId || idx}
                          onClick={() => onSelectResource(cit.resourceId)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2 py-0.5 transition cursor-pointer"
                        >
                          <Bookmark className="h-3 w-3 text-emerald-700 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{cit.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-xs max-w-[85%]">
              <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
                <span>
                  {includeSectionDocs
                    ? `Querying NotebookLM (${activeSourcesCount} sources) & correlating ${currentModuleId}...`
                    : `Querying NotebookLM Master Vault (${activeSourcesCount} active sources)...`}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-3 border border-red-100 flex items-start gap-2 text-xs text-red-800">
            <ShieldAlert className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Integration Notice</p>
              <p className="text-[11px] opacity-90">{error}</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form with integrated Wiki section checkbox */}
      <form onSubmit={handleSend} className="p-2.5 border-t border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between text-xs px-0.5">
          <label className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-emerald-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSectionDocs}
              onChange={(e) => setIncludeSectionDocs(e.target.checked)}
              className="accent-emerald-800 rounded h-3.5 w-3.5 cursor-pointer"
            />
            <span>Include {currentModuleId} Context</span>
          </label>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-semibold">
            {includeSectionDocs ? `${moduleResourcesCount} wiki docs` : 'Off'}
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask TFAN (${activeSourcesCount} NotebookLM sources)...`}
            disabled={isLoading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white text-slate-800 font-medium"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-emerald-800 text-white rounded-xl px-3.5 py-2 hover:bg-emerald-900 disabled:opacity-40 transition cursor-pointer flex items-center justify-center font-bold"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* NotebookLM TFAN Source Customization Popup Modal */}
      {isSourceModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92%] h-[500px] w-full overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-300" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">NotebookLM Source Manager</h4>
                  <p className="text-[10px] text-emerald-200 font-mono">
                    {activeSourcesCount} of {sources.length} Active Sources
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSourceModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 hover:bg-emerald-800 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Controls & Search */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 text-xs">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={sourceSearchQuery}
                  onChange={(e) => setSourceSearchQuery(e.target.value)}
                  placeholder="Search TFAN master sources..."
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 text-slate-800 font-medium"
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['All', 'GSE Specs', 'USPAP & Standards', 'Appraisal Textbooks', 'Field Layouts'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      activeCategoryFilter === cat
                        ? 'bg-emerald-800 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Select / Deselect All Bar */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectAllSources(true)}
                    className="text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => selectAllSources(false)}
                    className="text-slate-500 font-medium hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Showing {filteredSources.length} sources
                </span>
              </div>
            </div>

            {/* Scrollable Sources List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
              {filteredSources.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sources match your search filter.
                </div>
              ) : (
                filteredSources.map(s => (
                  <div
                    key={s.id}
                    onClick={() => toggleSource(s.id)}
                    className={`p-2.5 rounded-xl transition cursor-pointer flex items-start gap-2.5 my-0.5 ${
                      s.enabled ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'bg-white opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5 text-emerald-800">
                      {s.enabled ? (
                        <CheckSquare className="h-4 w-4 text-emerald-700" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${s.enabled ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                          {s.title}
                        </p>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 flex-shrink-0">
                          {s.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight line-clamp-1">
                        {s.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {activeSourcesCount} Active TFAN Sources
              </span>
              <button
                type="button"
                onClick={() => setIsSourceModalOpen(false)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                Apply Sources
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


