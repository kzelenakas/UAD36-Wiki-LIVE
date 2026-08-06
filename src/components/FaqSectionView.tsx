import React, { useState, useEffect } from 'react';
import { FAQSection, FAQEntry, SubmittedQuestion, UserProfile, WikiSection, TfanChatLog } from '../types';
import { getAccessToken, googleSignIn, sendGmail } from '../lib/googleDocsExport';
import {
  Bot,
  MessageSquare,
  CheckCircle, 
  Clock, 
  EyeOff, 
  Plus, 
  Clipboard, 
  User, 
  Send, 
  ShieldAlert, 
  BadgeHelp, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  FolderPlus, 
  HelpCircle,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Settings
} from 'lucide-react';

interface FaqSectionViewProps {
  sections: FAQSection[];
  faqEntries: FAQEntry[];
  submittedQuestions: SubmittedQuestion[];
  user: UserProfile;
  onRefreshData: () => void;
  curriculumModules: (string | WikiSection)[];
}

export default function FaqSectionView({
  sections,
  faqEntries,
  submittedQuestions,
  user,
  onRefreshData,
  curriculumModules
}: FaqSectionViewProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || 'all');
  const [activeTab, setActiveTab] = useState<'faqs' | 'submit-q' | 'review-queue' | 'tfan-log'>('faqs');

  // TFAN chat log queue (admin, #7)
  const [chatLogs, setChatLogs] = useState<TfanChatLog[]>([]);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);

  const fetchChatLogs = async () => {
    setChatLogsLoading(true);
    try {
      const res = await fetch('/api/admin/chat-logs');
      const data = await res.json();
      if (res.ok) setChatLogs(data.logs || []);
    } catch (e) {
      console.error('Error fetching TFAN logs:', e);
    } finally {
      setChatLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tfan-log' && user.role === 'admin') {
      fetchChatLogs();
    }
  }, [activeTab]);
  
  // Modals / forms
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqSectionId, setFaqSectionId] = useState(sections[0]?.id || '');
  const [faqTags, setFaqTags] = useState<string[]>([]);
  const [faqStatus, setFaqStatus] = useState<'draft' | 'review' | 'published'>('draft');

  const [askQuestionText, setAskQuestionText] = useState('');
  const [askCategoryName, setAskCategoryName] = useState('');
  const [submittedStatusText, setSubmittedStatusText] = useState<string | null>(null);

  // Category management state
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const handleRenameSection = async (id: string) => {
    if (!editingSectionName.trim()) return;
    try {
      const res = await fetch(`/api/faq/sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSectionName.trim(), actorEmail: user.email })
      });
      if (res.ok) {
        setEditingSectionId(null);
        setEditingSectionName('');
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSection = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the FAQ category "${name}"? This will delete all FAQ entries associated with this category.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/faq/sections/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorEmail: user.email })
      });
      if (res.ok) {
        if (selectedSectionId === id) {
          setSelectedSectionId('all');
        }
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReorderSection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Build orders array
    const orders = newSections.map((sec, idx) => ({
      id: sec.id,
      order: idx + 1
    }));

    try {
      const res = await fetch('/api/faq/sections/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders, actorEmail: user.email })
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Admin response state
  const [adminResponseId, setAdminResponseId] = useState<string | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [promoteSectionId, setPromoteSectionId] = useState(sections[0]?.id || '');

  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    try {
      const res = await fetch('/api/faq/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSectionName, actorEmail: user.email })
      });

      if (res.ok) {
        setNewSectionName('');
        setShowAddSection(false);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim() || !faqSectionId) return;

    try {
      const res = await fetch('/api/faq/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: faqSectionId,
          question: faqQuestion,
          answer: faqAnswer,
          status: faqStatus,
          moduleTags: faqTags,
          actorEmail: user.email
        })
      });

      if (res.ok) {
        setFaqQuestion('');
        setFaqAnswer('');
        setFaqTags([]);
        setShowAddFaq(false);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFaqStatus = async (faqId: string, newStatus: 'draft' | 'review' | 'published') => {
    try {
      const res = await fetch(`/api/faq/entries/${faqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actorEmail: user.email,
          note: `Changed publish status to ${newStatus}`
        })
      });

      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestionText.trim()) return;

    try {
      const res = await fetch('/api/submitted-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: askQuestionText,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          categoryName: askCategoryName || undefined
        })
      });

      if (res.ok) {
        setAskQuestionText('');
        setAskCategoryName('');
        setSubmittedStatusText("Your question was submitted. A quality specialist will review it and email a response to your True Footage address.");
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondQuestion = async (qId: string) => {
    if (!adminResponseText.trim()) return;
    const q = submittedQuestions.find(x => x.id === qId);

    try {
      const res = await fetch(`/api/submitted-questions/${qId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminResponse: adminResponseText,
          actorEmail: user.email
        })
      });

      if (res.ok) {
        // Deliver the answer by email to the appraiser (no in-app portal).
        if (q?.userEmail) {
          try {
            let token = getAccessToken();
            if (!token) token = (await googleSignIn())?.accessToken || null;
            if (token) {
              await sendGmail(
                token,
                q.userEmail,
                'Response to your UAD 3.6 inquiry',
                `Hi ${q.userName || 'there'},\n\n` +
                `Your question:\n${q.question}\n\n` +
                `Response from the UAD 3.6 Quality Team:\n${adminResponseText}\n\n` +
                `— True Footage Quality Development`
              );
              alert(`Response emailed to ${q.userEmail}.`);
            } else {
              alert('Response saved, but Google sign-in was needed to send the email — please try again.');
            }
          } catch (mailErr: any) {
            alert(`Response saved, but the email failed to send: ${mailErr.message}. (Confirm the Gmail API is enabled for the project.)`);
          }
        }
        setAdminResponseText('');
        setAdminResponseId(null);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteToFaq = async (qId: string) => {
    if (!promoteSectionId) return;

    try {
      const res = await fetch(`/api/submitted-questions/${qId}/promote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: promoteSectionId,
          actorEmail: user.email
        })
      });

      if (res.ok) {
        alert("Submitted question has been successfully promoted to a draft FAQ in the selected section!");
        setAdminResponseId(null);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTag = (tag: string) => {
    setFaqTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // Filter FAQ list based on roles and section
  const filteredFaqs = faqEntries.filter(entry => {
    // 1. Section filter
    const matchesSection = selectedSectionId === 'all' || entry.sectionId === selectedSectionId;
    // 2. Role filter: staff only sees published
    const matchesRole = user.role === 'admin' || entry.status === 'published';
    return matchesSection && matchesRole;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-sans">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white p-1 rounded-xl shadow-xs gap-1.5 self-start inline-flex">
        <button
          onClick={() => { setActiveTab('faqs'); setSubmittedStatusText(null); }}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === 'faqs' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Browse FAQs
        </button>
        <button
          onClick={() => setActiveTab('submit-q')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === 'submit-q' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Ask a Question
        </button>
        {user.role === 'admin' && (
          <button
            onClick={() => { setActiveTab('review-queue'); setSubmittedStatusText(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'review-queue' ? 'bg-emerald-800 text-white animate-pulse' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Review Queue
            <span className="bg-red-500 text-white text-[10px] font-bold h-5 px-1.5 rounded-full flex items-center justify-center">
              {submittedQuestions.filter(q => q.status === 'new').length}
            </span>
          </button>
        )}
        {user.role === 'admin' && (
          <button
            onClick={() => { setActiveTab('tfan-log'); setSubmittedStatusText(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tfan-log' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Review every question asked in the TFAN chat"
          >
            <Bot className="h-3.5 w-3.5" />
            TFAN Log
          </button>
        )}
      </div>

      {activeTab === 'tfan-log' && user.role === 'admin' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-800">TFAN Chat Log</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {chatLogs.length} entries
              </span>
              <button
                onClick={fetchChatLogs}
                className="text-[10px] font-bold text-emerald-800 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50 cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Every question asked in the TFAN assistant is logged here. The <span className="font-semibold">Linked Section</span> shows
            the wiki section the user chose to include, or <span className="font-semibold">General</span> if they did not select one.
          </p>

          {chatLogsLoading ? (
            <div className="text-center text-xs text-slate-400 py-12 font-mono">Loading TFAN log…</div>
          ) : chatLogs.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-12 font-mono">No TFAN chat questions logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3 font-bold">When</th>
                    <th className="py-2 pr-3 font-bold">User</th>
                    <th className="py-2 pr-3 font-bold">Linked Section</th>
                    <th className="py-2 pr-3 font-bold">Question</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {chatLogs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/60">
                      <td className="py-2.5 pr-3 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 block">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.userEmail}</span>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.section === 'General'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        }`}>
                          {log.section}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700 leading-relaxed min-w-[220px]">
                        {log.question}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* FAQ Sections Index */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  FAQ Categories
                </span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setShowAddSection(!showAddSection)}
                    className="text-emerald-800 hover:text-emerald-950 p-1 rounded-md bg-emerald-50 transition cursor-pointer"
                    title="Add Category Section"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {showAddSection && (
                <form onSubmit={handleAddSection} className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Section Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="e.g., General, Condition..."
                    className="block w-full text-xs p-2 border border-slate-200 rounded-lg bg-white mb-2"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddSection(false)}
                      className="text-[10px] px-2 py-1 text-slate-500 border border-slate-200 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-[10px] bg-emerald-800 text-white px-2.5 py-1 rounded font-semibold cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center mb-1">
                  <button
                    onClick={() => setSelectedSectionId('all')}
                    className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex-1 ${
                      selectedSectionId === 'all' && !isManagingCategories ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    disabled={isManagingCategories}
                  >
                    All Sections ({faqEntries.filter(f => user.role === 'admin' || f.status === 'published').length})
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsManagingCategories(!isManagingCategories);
                        setEditingSectionId(null);
                      }}
                      className={`ml-1.5 p-1.5 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 ${
                        isManagingCategories 
                          ? 'bg-amber-100 border-amber-200 text-amber-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Manage FAQ Categories"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">Manage</span>
                    </button>
                  )}
                </div>

                {sections.map((sec, idx) => {
                  const isEditing = editingSectionId === sec.id;
                  const active = selectedSectionId === sec.id && !isManagingCategories;
                  const count = faqEntries.filter(f => f.sectionId === sec.id && (user.role === 'admin' || f.status === 'published')).length;

                  return (
                    <div key={sec.id} className="w-full flex items-center justify-between gap-1 border-b border-slate-50 pb-1.5 last:border-b-0">
                      {isManagingCategories ? (
                        <div className="w-full flex flex-col gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingSectionName}
                                onChange={(e) => setEditingSectionName(e.target.value)}
                                className="flex-1 text-xs p-1 bg-white border border-slate-300 rounded focus:outline-emerald-800 text-slate-800 font-semibold"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenameSection(sec.id)}
                                className="p-1 bg-emerald-800 text-white rounded cursor-pointer"
                                title="Save"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSectionId(null)}
                                className="p-1 bg-slate-200 text-slate-600 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{sec.name}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    setEditingSectionId(sec.id);
                                    setEditingSectionName(sec.name);
                                  }}
                                  className="p-1 text-slate-600 hover:text-emerald-800 rounded hover:bg-slate-200 cursor-pointer"
                                  title="Rename"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleReorderSection(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 text-slate-600 hover:text-emerald-800 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleReorderSection(idx, 'down')}
                                  disabled={idx === sections.length - 1}
                                  className="p-1 text-slate-600 hover:text-emerald-800 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(sec.id, sec.name)}
                                  className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-slate-200 cursor-pointer"
                                  title="Delete Category"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedSectionId(sec.id)}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition truncate cursor-pointer flex justify-between items-center ${
                            active ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{sec.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {user.role === 'admin' && (
              <button
                onClick={() => setShowAddFaq(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all duration-150"
              >
                <Plus className="h-4 w-4" />
                Author New FAQ Entry
              </button>
            )}
          </div>

          {/* FAQ Entries List */}
          <div className="lg:col-span-9 space-y-4">
            
            {showAddFaq && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
                <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Author UAD 3.6 FAQ Entry</h3>
                <form onSubmit={handleAddFaq} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category Section</label>
                      <select
                        value={faqSectionId}
                        onChange={(e) => setFaqSectionId(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      >
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Initial Workflow Status</label>
                      <select
                        value={faqStatus}
                        onChange={(e) => setFaqStatus(e.target.value as any)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      >
                        <option value="draft">Draft (Admin Only)</option>
                        <option value="review">In Review (Reviewers Only)</option>
                        <option value="published">Published (Visible to All)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">FAQ Question</label>
                    <input
                      type="text"
                      required
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                      placeholder="Input core question..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">FAQ Answer</label>
                    <textarea
                      required
                      rows={4}
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      placeholder="Input structured response with standard specifications..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Associate wiki section tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {curriculumModules.map(moduleItem => {
                        const moduleName = typeof moduleItem === 'string' ? moduleItem : moduleItem.name;
                        const moduleDesc = typeof moduleItem === 'string' ? '' : moduleItem.description;
                        const active = faqTags.includes(moduleName);
                        return (
                          <div key={moduleName} className="relative group/faqtag">
                            {moduleDesc && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/faqtag:block z-50 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl pointer-events-none border border-slate-700">
                                <span className="font-bold text-emerald-300">{moduleName}</span> - {moduleDesc}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleTag(moduleName)}
                              className={`px-2.5 py-1 text-[11px] font-semibold border rounded-full transition cursor-pointer ${
                                active
                                  ? 'bg-emerald-800 border-emerald-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {moduleName}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddFaq(false)}
                      className="px-4 py-2 border rounded-xl text-xs text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl text-xs cursor-pointer"
                    >
                      Save FAQ Entry
                    </button>
                  </div>
                </form>
              </div>
            )}

            {filteredFaqs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500 font-mono">
                No FAQs matching the selected parameters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map(entry => {
                  const expanded = expandedFaqId === entry.id;
                  const secName = sections.find(s => s.id === entry.sectionId)?.name || 'General';

                  return (
                    <div
                      key={entry.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition duration-150"
                    >
                      {/* Top Actionable Bar */}
                      <div
                        onClick={() => setExpandedFaqId(expanded ? null : entry.id)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {secName}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 leading-snug">
                            {entry.question}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' && (
                            <span className={`text-[9px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-full ${
                              entry.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                              entry.status === 'review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {entry.status}
                            </span>
                          )}
                          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Expandable answer */}
                      {expanded && (
                        <div className="bg-slate-50/50 border-t border-slate-100 p-4">
                          <p className="text-xs text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 mb-3">
                            {entry.answer}
                          </p>

                          {entry.moduleTags && entry.moduleTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {entry.moduleTags.map(t => (
                                <span key={t} className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Admin status togglers */}
                          {user.role === 'admin' && (
                            <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase self-center mr-2">
                                Change workflow status:
                              </span>
                              <button
                                onClick={() => handleUpdateFaqStatus(entry.id, 'draft')}
                                disabled={entry.status === 'draft'}
                                className="text-[10px] font-semibold px-2 py-1 bg-white border rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                              >
                                Draft
                              </button>
                              <button
                                onClick={() => handleUpdateFaqStatus(entry.id, 'review')}
                                disabled={entry.status === 'review'}
                                className="text-[10px] font-semibold px-2 py-1 bg-white border rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleUpdateFaqStatus(entry.id, 'published')}
                                disabled={entry.status === 'published'}
                                className="text-[10px] font-semibold px-2.5 py-1 bg-emerald-800 text-white rounded disabled:opacity-30 cursor-pointer"
                              >
                                Publish Entry
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'submit-q' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800">
              <BadgeHelp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Ask a Question</h3>
              <p className="text-xs text-slate-500">
                Can't find it in the FAQ or reference docs? Send us your question — a quality specialist will email you a response at your True Footage address.
              </p>
            </div>
          </div>

          {submittedStatusText && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4 text-xs text-emerald-800">
              {submittedStatusText}
            </div>
          )}

          <form onSubmit={handleAskQuestion} className="space-y-4 font-sans text-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Topic / Section
              </label>
              <select
                required
                value={askCategoryName}
                onChange={(e) => setAskCategoryName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50 text-slate-800 font-medium"
              >
                <option value="">-- Select a topic --</option>
                {/* Source from the wiki sections (always populated) with FAQ
                    categories as a fallback, so this can never go empty. */}
                {(curriculumModules.length
                  ? curriculumModules.map(m => (typeof m === 'string' ? m : m.name))
                  : sections.map(s => s.name)
                ).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Your UAD 3.6 Inquiry
              </label>
              <textarea
                required
                rows={5}
                value={askQuestionText}
                onChange={(e) => setAskQuestionText(e.target.value)}
                placeholder="What's your question? Include the form, field, or scenario it relates to."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Send className="h-4 w-4" />
                Submit Question
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'review-queue' && user.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Appraisal Review & Promote Queue</h3>
              <p className="text-xs text-slate-500">
                Review submitted appraiser queries. Submit responses directly to their portals, or promote them to FAQ drafts to close knowledge loops.
              </p>
            </div>
          </div>

          {submittedQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 font-mono">
              All submitted tickets answered! The queue is clean.
            </div>
          ) : (
            <div className="space-y-4">
              {submittedQuestions.map(q => {
                const replying = adminResponseId === q.id;

                return (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
                    <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b">
                      <div className="flex items-center gap-1.5 font-mono text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{q.userName} ({q.userEmail})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono">{new Date(q.submittedAt).toLocaleDateString()}</span>
                        <span className={`text-[9px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-full ${
                          q.status === 'promoted' ? 'bg-indigo-100 text-indigo-800' :
                          q.status === 'answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-800 bg-slate-50 p-3 rounded-lg mb-4">
                      "{q.question}"
                    </p>

                    {q.adminResponse && !replying && (
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-4">
                        <span className="text-[10px] font-bold text-emerald-800 block mb-1">Answered:</span>
                        <p className="text-xs text-slate-700 leading-relaxed">{q.adminResponse}</p>
                      </div>
                    )}

                    {replying ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Respond to Appraiser</label>
                          <textarea
                            rows={3}
                            value={adminResponseText}
                            onChange={(e) => setAdminResponseText(e.target.value)}
                            placeholder="Input detailed response guidelines..."
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Promote directly to section:</label>
                            <select
                              value={promoteSectionId}
                              onChange={(e) => setPromoteSectionId(e.target.value)}
                              className="p-1 text-xs border rounded bg-white text-slate-700"
                            >
                              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>

                          <div className="flex gap-1.5 self-end">
                            <button
                              onClick={() => setAdminResponseId(null)}
                              className="text-[11px] font-semibold border px-3 py-1.5 rounded-lg text-slate-600 bg-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRespondQuestion(q.id)}
                              className="text-[11px] font-semibold bg-emerald-800 text-white px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-900"
                            >
                              Send Response Only
                            </button>
                            <button
                              onClick={() => handlePromoteToFaq(q.id)}
                              className="text-[11px] font-semibold bg-indigo-800 text-white px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-950"
                            >
                              Response + Promote FAQ
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAdminResponseId(q.id);
                            setAdminResponseText(q.adminResponse || '');
                          }}
                          className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-semibold cursor-pointer"
                        >
                          {q.adminResponse ? "Edit Response" : "Respond to Ticket"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
