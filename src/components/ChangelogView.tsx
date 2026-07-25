import { Resource, FAQEntry } from '../types';
import { Calendar, Tag, Bookmark, FileText, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';

interface ChangelogViewProps {
  resources: Resource[];
  faqEntries: FAQEntry[];
  onSelectResource: (resourceId: string) => void;
}

interface TimelineItem {
  id: string;
  type: 'resource' | 'faq';
  title: string;
  timestamp: string;
  description: string;
  tags: string[];
  refId: string;
}

export default function ChangelogView({ resources, faqEntries, onSelectResource }: TimelineItem[] | any) {
  // 1. Gather recently updated resources and FAQs
  const recentResources: TimelineItem[] = resources
    .filter(r => r.publishStatus === 'published')
    .map(r => ({
      id: `r-${r.id}`,
      type: 'resource',
      title: r.title,
      timestamp: r.driveLastModified,
      description: r.description || 'New rollout resource file uploaded/edited directly in Google Drive.',
      tags: r.moduleTags,
      refId: r.id
    }));

  const recentFaqs: TimelineItem[] = faqEntries
    .filter(f => f.status === 'published')
    .map(f => ({
      id: `f-${f.id}`,
      type: 'faq',
      title: `FAQ Added: ${f.question}`,
      timestamp: f.updatedAt || new Date().toISOString(),
      description: f.answer.slice(0, 150) + '...',
      tags: f.moduleTags || [],
      refId: f.id
    }));

  // Combine and sort chronologically
  const timeline: TimelineItem[] = [...recentResources, ...recentFaqs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 font-sans">
      <div className="bg-emerald-800 text-white p-6 rounded-2xl mb-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10">
          <Sparkles className="h-48 w-48" />
        </div>
        <div className="flex items-center gap-2.5 mb-2">
          <Sparkles className="h-5 w-5 text-emerald-300" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-300">True Footage Rollout Ledger</h2>
        </div>
        <h1 className="text-xl font-bold mb-2">What's New Since UAD 2.6</h1>
        <p className="text-xs text-emerald-100 leading-relaxed max-w-xl">
          Follow our live rollout ledger. As we drop new standard sheets, checklists, exhibits, and FAQs in our Google Workspace, updates stream here in real time.
        </p>
      </div>

      {timeline.length === 0 ? (
        <div className="text-center py-12 text-slate-400 italic text-xs font-mono bg-white border rounded-2xl">
          No items registered in the timeline ledger.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-3.5 space-y-8 pb-8">
          {timeline.map((item) => {
            const isResource = item.type === 'resource';

            return (
              <div key={item.id} className="relative pl-8">
                {/* Visual Bullet Icon */}
                <span className={`absolute left-0 top-1.5 -translate-x-1/2 rounded-full h-7 w-7 flex items-center justify-center border-4 border-slate-50 shadow-sm ${
                  isResource ? 'bg-emerald-800 text-white' : 'bg-indigo-800 text-white'
                }`}>
                  {isResource ? <FileText className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
                </span>

                {/* Body Content */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-sm hover:border-slate-300 transition duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                      isResource ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-800'
                    }`}>
                      {isResource ? 'Resource dropped' : 'FAQ Published'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mb-1 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map(t => (
                        <span key={t} className="text-[9px] font-bold font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>

                    {isResource && (
                      <button
                        onClick={() => onSelectResource(item.refId)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        View Resource
                        <span className="text-[10px] font-bold">→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
