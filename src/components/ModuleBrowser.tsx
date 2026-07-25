import { useState } from 'react';
import { Resource, ResourceType, WikiSection } from '../types';
import { 
  Search, 
  BookOpen, 
  Film, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileText, 
  Star, 
  Clock, 
  Compass, 
  ShieldAlert,
  Home,
  Scale,
  Sliders,
  Hammer,
  Award,
  Map,
  LayoutGrid,
  Layers,
  Info
} from 'lucide-react';

interface ModuleBrowserProps {
  resources: Resource[];
  onSelectResource: (resource: Resource) => void;
  bookmarks: string[];
  recentlyViewed: string[];
  currentModule: string;
  onSelectModule: (moduleName: string) => void;
  curriculumModules: (string | WikiSection)[];
}

export default function ModuleBrowser({
  resources,
  onSelectResource,
  bookmarks,
  recentlyViewed,
  currentModule,
  onSelectModule,
  curriculumModules
}: ModuleBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');

  const handleSelectResource = (res: Resource) => {
    onSelectResource(res);
  };

  // Find active section object for description display
  const activeSectionObj = curriculumModules.find(m => (typeof m === 'string' ? m : m.name) === currentModule);
  const activeDescription = activeSectionObj && typeof activeSectionObj !== 'string' ? activeSectionObj.description : '';

  // Filter resources based on module, search, and type
  const filteredResources = resources.filter(res => {
    const matchesModule = res.moduleTags.includes(currentModule);
    const matchesType = selectedType === 'all' || res.resourceType === selectedType;
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesModule && matchesType && matchesSearch && res.publishStatus === 'published';
  });

  const getIconForType = (type: ResourceType) => {
    switch (type) {
      case 'doc': return <FileText className="h-4 w-4 text-emerald-800" />;
      case 'sheet': return <FileSpreadsheet className="h-4 w-4 text-teal-800" />;
      case 'slide': return <Compass className="h-4 w-4 text-orange-800" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-800" />;
      case 'video': return <Film className="h-4 w-4 text-blue-800" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-amber-800" />;
    }
  };

  const getIconForModule = (moduleName: string, active: boolean) => {
    const name = moduleName.toLowerCase();
    const cls = `h-4.5 w-4.5 flex-shrink-0 ${active ? 'text-emerald-300' : 'text-slate-400 group-hover:text-emerald-800'}`;

    if (name.includes('overview') || name.includes('general') || name.includes('playbook') || name.includes('crosswalk')) {
      return <Compass className={cls} />;
    } else if (name.includes('subject') || name.includes('property') || name.includes('characteristic')) {
      return <Home className={cls} />;
    } else if (name.includes('comparison') || name.includes('sales') || name.includes('grid')) {
      return <Scale className={cls} />;
    } else if (name.includes('data') || name.includes('entry') || name.includes('total') || name.includes('filler')) {
      return <Sliders className={cls} />;
    } else if (name.includes('material') || name.includes('condition') || name.includes('rating')) {
      return <Hammer className={cls} />;
    } else if (name.includes('quality') || name.includes('structural') || name.includes('exhibit')) {
      return <Award className={cls} />;
    } else if (name.includes('location') || name.includes('view') || name.includes('map') || name.includes('photo')) {
      return <Map className={cls} />;
    } else if (name.includes('form') || name.includes('layouts') || name.includes('reporting')) {
      return <LayoutGrid className={cls} />;
    } else {
      return <Layers className={cls} />;
    }
  };

  const bookmarkedResources = resources.filter(r => bookmarks.includes(r.id));
  const recentlyViewedResources = resources.filter(r => recentlyViewed.includes(r.id)).slice(0, 5);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Search and Filters Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rollout guides, templates, condition charts..."
            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white text-slate-800"
          />
        </div>

        {/* Facet Filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {(['all', 'doc', 'sheet', 'slide', 'pdf', 'video', 'image'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition capitalize cursor-pointer ${
                selectedType === type
                  ? 'bg-emerald-800 border-emerald-800 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Modules Column (Left) + Resources List (Center) + Sidebar Rails (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Wiki Sections Grid Selector */}
        <div className="lg:col-span-3 space-y-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-2 px-1">
            Knowledge Sections
          </span>
          <div className="flex flex-col gap-1.5 bg-white border border-slate-200 p-3 rounded-2xl shadow-xs font-sans">
            {curriculumModules.map((modItem) => {
              const moduleName = typeof modItem === 'string' ? modItem : modItem.name;
              const moduleDesc = typeof modItem === 'string' ? '' : modItem.description;
              const active = moduleName === currentModule;
              const count = resources.filter(r => r.moduleTags.includes(moduleName) && r.publishStatus === 'published').length;

              return (
                <div key={moduleName} className="relative group/secbtn">
                  {/* Hover Popup Description Tooltip */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/secbtn:block z-50 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl pointer-events-none border border-slate-700 transition-all">
                    <div className="leading-snug">
                      <span className="font-bold text-emerald-300">{moduleName}</span>
                      {moduleDesc ? <span className="text-slate-200"> - {moduleDesc}</span> : null}
                    </div>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                  </div>

                  <button
                    onClick={() => onSelectModule(moduleName)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between gap-3 group cursor-pointer ${
                      active
                        ? 'bg-emerald-800 text-white shadow-md'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {getIconForModule(moduleName, active)}
                      <span className="text-xs font-semibold truncate leading-tight">{moduleName}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      active ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Resources List matching Module */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-800" />
                {currentModule}
              </h2>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                {filteredResources.length} files
              </span>
            </div>
            {activeDescription && (
              <p className="text-xs text-slate-600 bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 flex items-start gap-2 text-emerald-950">
                <Info className="h-4 w-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{activeDescription}</span>
              </p>
            )}
          </div>

          {filteredResources.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 font-mono flex flex-col items-center justify-center gap-2">
              <ShieldAlert className="h-8 w-8 text-slate-300" />
              <span>No active reference documents matched search parameters.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map(res => {
                const bookmarked = bookmarks.includes(res.id);
                return (
                  <div
                    key={res.id}
                    onClick={() => handleSelectResource(res)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-slate-300 hover:scale-[1.01] transition-all duration-150 cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex gap-2.5 items-start">
                        <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-emerald-50 transition duration-150 flex-shrink-0">
                          {getIconForType(res.resourceType)}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition leading-snug">
                            {res.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed truncate max-w-[280px]">
                            {res.description || 'Google Drive synced compliance reference guide.'}
                          </p>
                        </div>
                      </div>

                      {bookmarked && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-2 font-mono">
                      <span>Modified: {new Date(res.driveLastModified).toLocaleDateString()}</span>
                      <span>{res.size || 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: User Sidebar Rails (Bookmarks & Recent Views) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Bookmarks Rail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 border-b pb-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              Your Bookmarks
            </h3>

            {bookmarkedResources.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 leading-relaxed">
                No active bookmarks saved yet. Click star icons on resources in directory.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {bookmarkedResources.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectResource(r)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer flex items-center gap-2"
                  >
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      {getIconForType(r.resourceType)}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 truncate leading-tight block">
                      {r.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recently Viewed Rail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 border-b pb-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              Recently Viewed
            </h3>

            {recentlyViewedResources.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 leading-relaxed">
                View files to list your active session logs.
              </p>
            ) : (
              <div className="space-y-2">
                {recentlyViewedResources.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectResource(r)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer flex items-center gap-2"
                  >
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      {getIconForType(r.resourceType)}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 truncate leading-tight block">
                      {r.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
