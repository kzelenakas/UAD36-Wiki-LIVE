/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserProfile, Resource, FAQSection, FAQEntry, SubmittedQuestion, AuditLog, WikiSection } from './types';
import { installAuthFetch, subscribeAuth, signOutUser } from './lib/authClient';
import AuthScreen from './components/AuthScreen.tsx';
import ModuleBrowser from './components/ModuleBrowser.tsx';
import ResourceViewer from './components/ResourceViewer.tsx';
import FaqSectionView from './components/FaqSectionView.tsx';
import ChangelogView from './components/ChangelogView.tsx';
import AdminConsole from './components/AdminConsole.tsx';
import AiChatPanel from './components/AiChatPanel.tsx';
import HomeLandingView from './components/HomeLandingView.tsx';
import { ShieldCheck, BookOpen, HelpCircle, Sparkles, Settings, LogOut, Menu, X, Lock, Home, ExternalLink } from 'lucide-react';

// Attach the Firebase ID token to all /api requests, before any fetch runs.
installAuthFetch();

// External URAR Interactive Tool (separate GCP project). Opens in its own tab.
// Set to the tool's URL to show the nav link; empty string hides it.
// ponytail: a plain constant — one rarely-changing URL, no need for config UI.
const URAR_TOOL_URL = 'https://REPLACE-WITH-urar-interactive-tool-URL';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('true_footage_user');
    return saved ? JSON.parse(saved) : null;
  });
  // Gate rendering until Firebase reports whether a live session exists, so a
  // stale localStorage profile can't grant access after the session expires.
  const [authReady, setAuthReady] = useState(false);

  const [currentTab, setCurrentTab] = useState<'home' | 'modules' | 'faqs' | 'changelog' | 'admin'>('home');
  const [currentModule, setCurrentModule] = useState<string>('UAD 3.6 General Overview');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Core collections state
  const [resources, setResources] = useState<Resource[]>([]);
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [faqEntries, setFaqEntries] = useState<FAQEntry[]>([]);
  const [submittedQuestions, setSubmittedQuestions] = useState<SubmittedQuestion[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [curriculumModules, setCurriculumModules] = useState<(string | WikiSection)[]>([]);
  const [systemConfig, setSystemConfig] = useState<{ driveFolderId: string; driveFolderName: string; notebookLmUrl: string } | null>(null);

  // User personalization states (persisted locally)
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('tf_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    const saved = localStorage.getItem('tf_recently_viewed');
    return saved ? JSON.parse(saved) : [];
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch collections from full-stack Express server
  const fetchAllData = async () => {
    try {
      const [resResources, resSections, resEntries, resQuestions, resLogs, resModules, resConfig] = await Promise.all([
        fetch('/api/resources').then(r => r.json()),
        fetch('/api/faq/sections').then(r => r.json()),
        fetch('/api/faq/entries').then(r => r.json()),
        fetch('/api/submitted-questions').then(r => r.json()),
        user?.role === 'admin' ? fetch('/api/audit-logs').then(r => r.json()) : Promise.resolve({ logs: [] }),
        fetch('/api/curriculum/modules').then(r => r.json()),
        fetch('/api/config').then(r => r.json())
      ]);

      setResources(resResources.resources || []);
      setFaqSections(resSections.sections || []);
      setFaqEntries(resEntries.entries || []);
      setSubmittedQuestions(resQuestions.questions || []);
      setCurriculumModules(resModules.modules || []);
      setSystemConfig(resConfig.config || null);
      if (user?.role === 'admin') {
        setAuditLogs(resLogs.logs || []);
      }
    } catch (error) {
      console.error("Error fetching rollout wiki data collections:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Security: require a live Firebase session. If Firebase has no signed-in
  // user (session expired / signed out elsewhere), drop the cached profile and
  // force re-authentication.
  useEffect(() => {
    const unsub = subscribeAuth((fbUser) => {
      if (!fbUser) {
        setUser(null);
        localStorage.removeItem('true_footage_user');
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Keep current module in sync if current list updates
  useEffect(() => {
    if (curriculumModules.length > 0) {
      const moduleNames = curriculumModules.map(m => typeof m === 'string' ? m : m.name);
      if (!moduleNames.includes(currentModule)) {
        setCurrentModule(moduleNames[0]);
      }
    }
  }, [curriculumModules, currentModule]);

  // Sync bookmarks & history
  useEffect(() => {
    localStorage.setItem('tf_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('tf_recently_viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('true_footage_user', JSON.stringify(profile));
  };

  const handleLogout = () => {
    signOutUser();
    setUser(null);
    localStorage.removeItem('true_footage_user');
    setSelectedResource(null);
    setCurrentTab('modules');
  };

  const handleBookmarkToggle = (id: string) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleViewResource = (res: Resource) => {
    setSelectedResource(res);
    // Add to recently viewed list (move to front, keep unique)
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== res.id);
      return [res.id, ...filtered].slice(0, 10);
    });
  };

  const handleSelectResourceById = (id: string) => {
    const found = resources.find(r => r.id === id || r.driveFileId === id);
    if (found) {
      handleViewResource(found);
      setCurrentTab('modules');
    } else {
      alert(`Cited document ID '${id}' is currently offline in Drive directory.`);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <ShieldCheck className="h-5 w-5 text-emerald-700 animate-pulse" />
          Verifying secure session…
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Primary Header Navbar */}
      <nav className="bg-emerald-950 text-white shadow-md border-b border-emerald-900/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => { setCurrentTab('home'); setSelectedResource(null); }}
              className="flex items-center gap-3 text-left hover:opacity-90 transition cursor-pointer group"
              title="Home Page"
            >
              <div className="bg-emerald-800 p-2 rounded-xl text-white shadow-sm group-hover:bg-emerald-700 transition">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-wide block">True Footage</span>
                <span className="text-[10px] text-emerald-300 font-mono tracking-wider block -mt-1 font-bold">
                  UAD 3.6 WIKI PORTAL
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => { setCurrentTab('home'); setSelectedResource(null); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'home' ? 'bg-emerald-900/80 text-white' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Home className="h-4 w-4" />
                Home
              </button>
              <button
                onClick={() => { setCurrentTab('modules'); setSelectedResource(null); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'modules' ? 'bg-emerald-900/80 text-white' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Knowledge Sections
              </button>
              <button
                onClick={() => { setCurrentTab('faqs'); setSelectedResource(null); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'faqs' ? 'bg-emerald-900/80 text-white' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                Wiki FAQs
              </button>
              <button
                onClick={() => { setCurrentTab('changelog'); setSelectedResource(null); }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'changelog' ? 'bg-emerald-900/80 text-white' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Changelog
              </button>
              {URAR_TOOL_URL && !URAR_TOOL_URL.includes('REPLACE-WITH') && (
                <a
                  href={URAR_TOOL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 text-emerald-100 hover:text-white"
                  title="Opens the URAR Interactive Tool in a new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                  URAR Tool
                </a>
              )}
              {user.role === 'admin' && (
                <button
                  onClick={() => { setCurrentTab('admin'); setSelectedResource(null); }}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    currentTab === 'admin' ? 'bg-amber-900/60 border border-amber-800 text-amber-200' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Admin Console
                </button>
              )}
            </div>

            {/* User credentials & logout */}
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-emerald-900/60">
              <div className="text-right">
                <span className="text-xs font-bold block">{user.displayName}</span>
                <span className="text-[10px] text-emerald-300 font-mono uppercase tracking-wider block font-bold">
                  {user.role} role
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-900 rounded-lg cursor-pointer transition"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="p-1.5 text-emerald-200 hover:text-white"
                title="Log Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-900 rounded-lg cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-emerald-950 border-t border-emerald-900/60 px-4 pt-2 pb-4 space-y-1">
            <button
              onClick={() => { setCurrentTab('home'); setSelectedResource(null); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg block text-emerald-100 hover:bg-emerald-900"
            >
              Home Landing
            </button>
            <button
              onClick={() => { setCurrentTab('modules'); setSelectedResource(null); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg block text-emerald-100 hover:bg-emerald-900"
            >
              Knowledge Sections
            </button>
            <button
              onClick={() => { setCurrentTab('faqs'); setSelectedResource(null); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg block text-emerald-100 hover:bg-emerald-900"
            >
              Wiki FAQs
            </button>
            <button
              onClick={() => { setCurrentTab('changelog'); setSelectedResource(null); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg block text-emerald-100 hover:bg-emerald-900"
            >
              Changelog
            </button>
            {URAR_TOOL_URL && !URAR_TOOL_URL.includes('REPLACE-WITH') && (
              <a
                href={URAR_TOOL_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg block text-emerald-100 hover:bg-emerald-900"
              >
                URAR Tool ↗
              </a>
            )}
            {user.role === 'admin' && (
              <button
                onClick={() => { setCurrentTab('admin'); setSelectedResource(null); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-200 rounded-lg block hover:bg-emerald-900"
              >
                Admin Console (Restricted)
              </button>
            )}
            <div className="pt-2 border-t border-emerald-900/40 text-xs px-3">
              <p className="font-bold text-emerald-200">{user.displayName}</p>
              <p className="text-[10px] text-emerald-400 uppercase font-mono font-bold">{user.role} role</p>
            </div>
          </div>
        )}
      </nav>

      {/* Main Body */}
      <main className="flex-1 pb-24">
        {selectedResource ? (
          <ResourceViewer
            resource={selectedResource}
            user={user}
            onBack={() => setSelectedResource(null)}
            faqEntries={faqEntries}
            onBookmarkToggle={handleBookmarkToggle}
            isBookmarked={bookmarks.includes(selectedResource.id)}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <HomeLandingView
                onNavigateTab={(tab) => { setCurrentTab(tab); setSelectedResource(null); }}
                onSelectModule={(modName) => setCurrentModule(modName)}
                curriculumModules={curriculumModules}
                totalResources={resources.length}
                totalFaqs={faqEntries.length}
                userRole={user.role}
              />
            )}

            {currentTab === 'modules' && (
              <ModuleBrowser
                resources={resources}
                onSelectResource={handleViewResource}
                bookmarks={bookmarks}
                recentlyViewed={recentlyViewed}
                currentModule={currentModule}
                onSelectModule={setCurrentModule}
                curriculumModules={curriculumModules}
              />
            )}

            {currentTab === 'faqs' && (
              <FaqSectionView
                sections={faqSections}
                faqEntries={faqEntries}
                submittedQuestions={submittedQuestions}
                user={user}
                onRefreshData={fetchAllData}
                curriculumModules={curriculumModules}
              />
            )}

            {currentTab === 'changelog' && (
              <ChangelogView
                resources={resources}
                faqEntries={faqEntries}
                onSelectResource={handleSelectResourceById}
              />
            )}

            {currentTab === 'admin' && user.role === 'admin' && (
              <AdminConsole
                auditLogs={auditLogs}
                onRefreshData={fetchAllData}
                userEmail={user.email}
                curriculumModules={curriculumModules}
                systemConfig={systemConfig}
                resources={resources}
                faqSections={faqSections}
              />
            )}
          </>
        )}
      </main>

      {/* Floating custom NotebookLM enterprise chat panel */}
      <AiChatPanel
        currentModuleId={currentModule}
        onSelectResource={handleSelectResourceById}
        resources={resources}
        notebookLmUrl={systemConfig?.notebookLmUrl}
      />
    </div>
  );
}
