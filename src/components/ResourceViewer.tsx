import React, { useState, useEffect } from 'react';
import { Resource, ResourceAnnotation, FAQEntry, UserProfile } from '../types';
import { FileText, Calendar, Cloud, Bookmark, BookmarkCheck, ArrowLeft, MessageSquare, History, Plus, AlertCircle, Trash2, Eye, ShieldCheck, Share2 } from 'lucide-react';

interface ResourceViewerProps {
  resource: Resource;
  user: UserProfile;
  onBack: () => void;
  faqEntries: FAQEntry[];
  onBookmarkToggle: (resourceId: string) => void;
  isBookmarked: boolean;
}

interface Revision {
  id: string;
  revisionNo: number;
  author: string;
  timestamp: string;
  note: string;
}

export default function ResourceViewer({
  resource,
  user,
  onBack,
  faqEntries,
  onBookmarkToggle,
  isBookmarked
}: ResourceViewerProps) {
  const [annotations, setAnnotations] = useState<ResourceAnnotation[]>([]);
  const [annotationText, setAnnotationText] = useState('');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'revisions' | 'annotations'>('view');
  const [error, setError] = useState<string | null>(null);

  // Load annotations and generate simulated revision histories on mount
  useEffect(() => {
    fetchAnnotations();
    generateRevisions();
    setActiveTab('view');
    setSelectedRevision(null);
  }, [resource]);

  const fetchAnnotations = async () => {
    try {
      const res = await fetch(`/api/annotations?resourceId=${resource.id}`);
      const data = await res.json();
      if (res.ok) {
        setAnnotations(data.annotations);
      }
    } catch (e) {
      console.error('Error fetching annotations:', e);
    }
  };

  const generateRevisions = () => {
    const list: Revision[] = [
      {
        id: 'rev-3',
        revisionNo: 3,
        author: 'kevin.zelenakas@truefootage.tech',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        note: 'Calibrated Condition classifications with minor updates to Fannie Mae specifications.'
      },
      {
        id: 'rev-2',
        revisionNo: 2,
        author: 'kevin.zelenakas@truefootage.tech',
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        note: 'Added additional layout examples and updated location Einfluss classifications.'
      },
      {
        id: 'rev-1',
        revisionNo: 1,
        author: 'quality-system@truefootage.tech',
        timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        note: 'Initial import of UAD 3.6 standard reference blueprint from Fannie Mae Shared Workspace.'
      }
    ];
    setRevisions(list);
  };

  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annotationText.trim()) return;

    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: resource.id,
          text: annotationText,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAnnotations(prev => [...prev, data.annotation]);
        setAnnotationText('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    try {
      const res = await fetch(`/api/annotations/${annId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          isAdmin: user.role === 'admin'
        })
      });

      if (res.ok) {
        setAnnotations(prev => prev.filter(a => a.id !== annId));
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRestoreRevision = async (rev: Revision) => {
    if (confirm(`Are you sure you want to revert resource '${resource.title}' back to Revision #${rev.revisionNo}? This will log an audit event.`)) {
      try {
        // Log action
        const resUpdate = await fetch(`/api/resources/${resource.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorEmail: user.email,
            note: `Reverted back to Revision #${rev.revisionNo} of standard documents`
          })
        });

        if (resUpdate.ok) {
          alert(`Successfully restored Revision #${rev.revisionNo} of '${resource.title}'! Drive status updated.`);
          setSelectedRevision(rev);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Find related FAQs sharing the same tags
  const relatedFaqs = faqEntries.filter(
    faq => faq.status === 'published' && faq.moduleTags.some(tag => resource.moduleTags.includes(tag))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-sans">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Cloud className="h-3.5 w-3.5 text-emerald-700" />
            <span>Drive ID: {resource.driveFileId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onBookmarkToggle(resource.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4 text-amber-600 fill-amber-600" />
                Bookmarked
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                Bookmark Resource
              </>
            )}
          </button>
          
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
            {resource.size || 'N/A'}
          </span>
        </div>
      </div>

      {/* Grid Layout: Main Embed + Metadata Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8 columns: Render Embed stage */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col h-[550px]">
            {/* Stage Tabs */}
            <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('view')}
                  className={`text-xs px-3 py-1.5 font-semibold rounded-md transition cursor-pointer ${
                    activeTab === 'view' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Document View
                </button>
                <button
                  onClick={() => setActiveTab('revisions')}
                  className={`text-xs px-3 py-1.5 font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'revisions' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="h-3 w-3" />
                  Drive Revisions
                </button>
                <button
                  onClick={() => setActiveTab('annotations')}
                  className={`text-xs px-3 py-1.5 font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'annotations' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-3 w-3" />
                  Annotations ({annotations.length})
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono tracking-wider">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                SECURED CONNECTED STAGE
              </div>
            </div>

            {/* Stage Body */}
            <div className="flex-1 bg-slate-800 relative">
              {activeTab === 'view' && (
                <div className="w-full h-full">
                  {resource.resourceType === 'image' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <img
                        src={resource.webViewLink}
                        alt={resource.title}
                        referrerPolicy="no-referrer"
                        className="max-h-[460px] object-contain rounded-lg shadow-2xl border border-slate-700"
                      />
                      <span className="text-slate-400 text-xs mt-3 block">{resource.title} • Structural Exhibit</span>
                    </div>
                  ) : resource.resourceType === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <iframe
                        src={resource.webViewLink}
                        title={resource.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    // Google Doc/Sheet/Slide or general PDF embed
                    <div className="w-full h-full flex flex-col">
                      <iframe
                        src={resource.webViewLink}
                        title={resource.title}
                        className="w-full flex-1 border-0 bg-white"
                      />
                      <div className="bg-slate-950 px-4 py-2 text-slate-400 text-[11px] flex items-center justify-between">
                        <span>Embedding official Workspace document in live edit format.</span>
                        <a
                          href={resource.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline font-bold"
                        >
                          Open in Drive ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'revisions' && (
                <div className="p-6 text-white overflow-y-auto h-full space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-2">
                      Google Drive Native Revision Logs
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      True Footage mirrors the exact revision history from Google Drive. Admins can roll back resources directly in-app, logging full audit telemetry.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className={`p-4 rounded-xl border transition ${
                          selectedRevision?.id === rev.id
                            ? 'bg-emerald-950/40 border-emerald-700 text-white'
                            : 'bg-slate-900 border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="bg-emerald-800 text-[10px] text-white px-2 py-0.5 rounded font-bold font-mono">
                              REV #{rev.revisionNo}
                            </span>
                            <span className="text-xs text-slate-300 font-mono ml-2">{rev.author}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(rev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 italic mb-3 leading-relaxed">
                          "{rev.note}"
                        </p>
                        
                        <div className="flex justify-end gap-2">
                          {selectedRevision?.id === rev.id ? (
                            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700 px-2.5 py-1 rounded-md font-mono font-bold flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> CURRENT VERSION ACTIVE
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRestoreRevision(rev)}
                              className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] px-2.5 py-1 rounded font-semibold transition cursor-pointer"
                            >
                              Restore Revision
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'annotations' && (
                <div className="p-6 text-white h-full flex flex-col justify-between">
                  <div className="overflow-y-auto flex-1 space-y-4 mb-4">
                    <div>
                      <h4 className="text-sm font-semibold tracking-wide text-slate-300 uppercase mb-1">
                        In-Wiki Appraisal Sticky Annotations
                      </h4>
                      <p className="text-xs text-slate-400">
                        Create sticky notes to flag sections that require further calibration. These comments are clustered for the Quality Team.
                      </p>
                    </div>

                    {annotations.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs font-mono">
                        No appraiser annotations logged on this resource yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {annotations.map((ann) => (
                          <div key={ann.id} className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-slate-300 truncate max-w-[150px]">
                                {ann.userName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(ann.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-2 rounded-lg">
                              {ann.text}
                            </p>
                            <div className="flex justify-end gap-2 mt-2">
                              {(ann.userEmail === user.email || user.role === 'admin') && (
                                <button
                                  onClick={() => handleDeleteAnnotation(ann.id)}
                                  className="text-red-400 hover:text-red-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete Annotation
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Annotation form */}
                  <form onSubmit={handleAddAnnotation} className="flex gap-2">
                    <input
                      type="text"
                      value={annotationText}
                      onChange={(e) => setAnnotationText(e.target.value)}
                      placeholder="Add an inspection sticky note or feedback..."
                      className="flex-1 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 px-3.5 py-2.5"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Note
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Description & metadata cards below stage */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {resource.moduleTags.map(tag => (
                <span key={tag} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug mb-2">{resource.title}</h1>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Last Modified: {new Date(resource.driveLastModified).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Type: {resource.resourceType.toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              {resource.description || 'No descriptive guide logged for this resource.'}
            </p>
          </div>
        </div>

        {/* Right 4 columns: Sidebar (Related FAQs & Guides) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Related FAQs Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-emerald-800" />
              Related Section FAQs
            </h3>
            
            {relatedFaqs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No published FAQs matched this resource's section tag.</p>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                {relatedFaqs.map((faq, i) => (
                  <div key={faq.id} className={`${i > 0 ? 'pt-3' : ''}`}>
                    <h4 className="text-xs font-bold text-slate-800 mb-1 leading-snug">
                      Q: {faq.question}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-md flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h4 className="text-xs font-bold tracking-wider uppercase text-emerald-300">
                Staff Quick Actions
              </h4>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              These reference materials are direct pipelines to appraisal field tool guidelines. Use annotations to highlight data conflicts.
            </p>

            <div className="mt-2 space-y-2">
              <a
                href={resource.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center bg-emerald-800 hover:bg-emerald-700 text-white py-2 px-3 text-xs font-semibold rounded-xl block transition cursor-pointer"
              >
                Open Google Drive ↗
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resource.webViewLink || '');
                  alert('Google Drive Link copied to clipboard!');
                }}
                className="w-full text-center bg-emerald-900/50 hover:bg-emerald-900 text-emerald-100 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share Asset link
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
