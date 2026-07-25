import React from 'react';
import { WikiSection } from '../types';
import {
  ShieldCheck,
  BookOpen,
  HelpCircle,
  Sparkles,
  FolderSync,
  MessageSquare,
  FileText,
  ArrowRight,
  CheckCircle2,
  Compass,
  Layers,
  Search,
  Bookmark,
  Users,
  Award,
  Bot
} from 'lucide-react';

interface HomeLandingViewProps {
  onNavigateTab: (tab: 'modules' | 'faqs' | 'changelog' | 'admin') => void;
  onSelectModule: (moduleName: string) => void;
  curriculumModules: (string | WikiSection)[];
  totalResources: number;
  totalFaqs: number;
  userRole: string;
}

export default function HomeLandingView({
  onNavigateTab,
  onSelectModule,
  curriculumModules,
  totalResources,
  totalFaqs,
  userRole
}: HomeLandingViewProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-sans">
      {/* Hero Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl border border-emerald-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              UAD 3.6 Knowledge Wiki <span className="text-emerald-300 font-serif italic">&amp; TFAN Assistant</span>
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
              Welcome to the centralized reference portal for True Footage staff appraisers navigating Fannie Mae &amp; Freddie Mac UAD 3.6 standards. Access live Google Drive-synced guidelines, interactive FAQ knowledge, and UAD 3.6 TFAN Chat grounded in official appraisal specifications.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab('modules')}
                className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-md hover:shadow-lg"
              >
                <BookOpen className="h-4 w-4 text-emerald-800" />
                Explore Knowledge Sections
                <ArrowRight className="h-4 w-4 text-emerald-800" />
              </button>

              <button
                onClick={() => onNavigateTab('faqs')}
                className="px-5 py-3 bg-emerald-800/90 hover:bg-emerald-800 border border-emerald-700/80 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 text-emerald-300" />
                Browse Wiki FAQs ({totalFaqs})
              </button>
            </div>
          </div>

          {/* Company Branding Logo in Top Right */}
          <div className="flex-shrink-0 pt-1">
            <div className="tf-logo opacity-90 hover:opacity-100 transition" aria-label="True Footage Logo" title="True Footage" />
          </div>
        </div>

        {/* Floating Quick Stat Badges */}
        <div className="mt-8 pt-8 border-t border-emerald-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-emerald-100">
          <div>
            <div className="text-2xl font-black text-white font-mono">{curriculumModules.length || 10}</div>
            <div className="text-xs text-emerald-300/80 font-medium mt-0.5">Knowledge Sections</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{totalResources}</div>
            <div className="text-xs text-emerald-300/80 font-medium mt-0.5">Synced Documents</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{totalFaqs}</div>
            <div className="text-xs text-emerald-300/80 font-medium mt-0.5">Published FAQs</div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-300 font-mono">24/7 AI</div>
            <div className="text-xs text-emerald-300/80 font-medium mt-0.5">UAD 3.6 TFAN Grounded</div>
          </div>
        </div>
      </div>

      {/* Instructions / How-to-Use Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">User Guide</div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">How to Use This Portal</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">Quick 4-Step Walkthrough</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs hover:border-emerald-300 transition relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center font-mono text-base border border-emerald-200/60">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-emerald-700" />
              Browse Sections
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Navigate the 10 core UAD 3.6 sections from Crosswalk/Playbook to TF Formfiller. Access official Fannie Mae &amp; Freddie Mac specifications, exhibits, and guides.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs hover:border-emerald-300 transition relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center font-mono text-base border border-emerald-200/60">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-700" />
              View &amp; Annotate
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open PDFs, Google Docs, Sheets, Slides, or Video guides in the built-in viewer. Bookmark key files and add collaborative text highlight notes.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs hover:border-emerald-300 transition relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center font-mono text-base border border-emerald-200/60">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-emerald-700" />
              Search &amp; Submit FAQs
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Search verified appraisal questions by topic. Can’t find an answer? Submit your inquiry directly to the Quality &amp; Development Team (QDT) queue.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-xs hover:border-emerald-300 transition relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center font-mono text-base border border-emerald-200/60">
              04
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-emerald-700" />
              UAD 3.6 TFAN Chat
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click the UAD 3.6 TFAN Chat button in the bottom right corner anytime. Ask questions grounded strictly in the active section’s reference files.
            </p>
          </div>
        </div>
      </div>

      {/* Section Quick-Jump Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Knowledge Curriculum</div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Explore Knowledge Sections</h2>
          </div>
          <button
            onClick={() => onNavigateTab('modules')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
          >
            View All Sections <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {curriculumModules.map((mod, index) => {
            const secName = typeof mod === 'string' ? mod : mod.name;
            const secDesc = typeof mod === 'string' ? '' : mod.description;

            return (
              <div
                key={index}
                onClick={() => {
                  onSelectModule(secName);
                  onNavigateTab('modules');
                }}
                className="relative group/card bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-800 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                {/* Popup description tooltip on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/card:block z-50 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl pointer-events-none border border-slate-700 transition-all">
                  <div className="leading-snug">
                    <span className="font-bold text-emerald-300">{secName}</span>
                    {secDesc ? <span className="text-slate-200"> - {secDesc}</span> : null}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      SECTION {index < 9 ? `0${index + 1}` : index + 1}
                    </span>
                    <BookOpen className="h-4 w-4 text-slate-400 group-hover/card:text-emerald-800 transition" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover/card:text-emerald-900 transition leading-snug">
                    {secName}
                  </h3>
                  {secDesc && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {secDesc}
                    </p>
                  )}
                </div>

                <div className="flex items-center text-xs font-semibold text-emerald-800 group-hover/card:translate-x-1 transition pt-1 border-t border-slate-100">
                  <span>Access Section</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appraiser Facing Tools Synopsis */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 border border-slate-800 shadow-xl">
        <div className="max-w-2xl space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Appraiser Toolset Synopsis</div>
          <h3 className="text-xl sm:text-2xl font-bold">Comprehensive Tools for True Footage Appraisers</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Essential resources and AI capabilities designed to support field collection, data entry, and UAD 3.6 quality compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Tool 1: Knowledge Library */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 hover:border-emerald-500/50 transition">
            <div className="p-2.5 rounded-xl bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 w-fit">
              <BookOpen className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Knowledge Library</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Centralized repository of UAD 3.6 reference guidelines, standard sheets, exhibits, field coordinate maps, and live-synced Google Drive files with built-in document viewing and team annotations.
            </p>
            <button
              onClick={() => onNavigateTab('modules')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-1 cursor-pointer"
            >
              Open Library <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Tool 2: FAQs */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 hover:border-emerald-500/50 transition">
            <div className="p-2.5 rounded-xl bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 w-fit">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">FAQs &amp; QDT Inquiries</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Comprehensive, searchable database of verified UAD 3.6 appraisal questions and answers categorized by section, with direct escalation to the Quality &amp; Development Team (QDT) queue.
            </p>
            <button
              onClick={() => onNavigateTab('faqs')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-1 cursor-pointer"
            >
              Explore FAQs <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Tool 3: UAD 3.6 TFAN */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 hover:border-emerald-500/50 transition">
            <div className="p-2.5 rounded-xl bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 w-fit">
              <Bot className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">UAD 3.6 TFAN Chat</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Interactive True Footage Appraisal Network AI assistant grounded directly in active section guidelines and official specifications to provide instant, verifiable Q&amp;A with direct citations.
            </p>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 pt-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span>Available via floating chat toggle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
