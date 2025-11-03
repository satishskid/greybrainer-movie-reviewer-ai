import React, { useState, useEffect } from 'react';
import { researchPublicationService, PublishedResearch } from '../services/researchPublicationService';
import { LoadingSpinner } from './LoadingSpinner';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ShareIcon } from './icons/ShareIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ReadMoreLess } from './ReadMoreLess';

interface PublicResearchPortalProps {
  isPublicView?: boolean; // If true, shows public-facing version
}

export const PublicResearchPortal: React.FC<PublicResearchPortalProps> = ({ isPublicView = false }) => {
  const [research, setResearch] = useState<PublishedResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResearch, setSelectedResearch] = useState<PublishedResearch | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadResearch();
  }, []);

  const loadResearch = async () => {
    try {
      setLoading(true);
      const publishedResearch = await researchPublicationService.getPublishedResearch();
      setResearch(publishedResearch);
    } catch (error) {
      console.error('Error loading research:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'industry-trends', 'technology', 'audience-behavior', 'creative-analysis', 'market-insights'];

  const filteredResearch = research.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleShare = async (research: PublishedResearch) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: research.title,
          text: research.summary,
          url: window.location.href + `#research-${research.id}`
        });
      } catch (error) {
        // Fallback to copy link
        copyToClipboard(`${window.location.href}#research-${research.id}`, research.id);
      }
    } else {
      copyToClipboard(`${window.location.href}#research-${research.id}`, research.id);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const incrementViews = async (researchId: string) => {
    await researchPublicationService.incrementViews(researchId);
    // Update local state
    setResearch(prev => prev.map(item => 
      item.id === researchId 
        ? { ...item, views: item.views + 1 }
        : item
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'all': 'All Research',
      'industry-trends': 'Industry Trends',
      'technology': 'Technology & Innovation',
      'audience-behavior': 'Audience Behavior',
      'creative-analysis': 'Creative Analysis',
      'market-insights': 'Market Insights'
    };
    return labels[category] || category;
  };

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        {/* Public Header */}
        <div className="bg-slate-800/90 border-b border-slate-700">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
                Greybrainer Research
              </h1>
              <p className="text-slate-300 text-lg">
                AI-Powered Film Industry Insights & Analysis
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Discover the latest trends, technologies, and creative insights shaping the future of cinema
              </p>
            </div>
          </div>
        </div>

        {/* Public Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <PublicResearchContent 
            research={filteredResearch}
            loading={loading}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categories={categories}
            getCategoryLabel={getCategoryLabel}
            formatDate={formatDate}
            handleShare={handleShare}
            copyToClipboard={copyToClipboard}
            incrementViews={incrementViews}
            copied={copied}
          />
        </div>

        {/* Public Footer */}
        <div className="bg-slate-800/50 border-t border-slate-700 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 text-center">
            <p className="text-slate-400 text-sm">
              © 2024 Greybrainer AI. All research is AI-generated for educational and analytical purposes.
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Want to contribute or access our platform? Contact us for collaboration opportunities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Internal View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <DocumentTextIcon className="w-8 h-8 text-indigo-400 mr-3" />
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Research Publications</h2>
            <p className="text-slate-400">Manage and publish research insights</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.open('/research-portal', '_blank')}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            View Public Portal
          </button>
        </div>
      </div>

      <PublicResearchContent 
        research={filteredResearch}
        loading={loading}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categories={categories}
        getCategoryLabel={getCategoryLabel}
        formatDate={formatDate}
        handleShare={handleShare}
        copyToClipboard={copyToClipboard}
        incrementViews={incrementViews}
        copied={copied}
        isAdminView={true}
      />
    </div>
  );
};

// Shared content component
const PublicResearchContent: React.FC<{
  research: PublishedResearch[];
  loading: boolean;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categories: string[];
  getCategoryLabel: (category: string) => string;
  formatDate: (date: string) => string;
  handleShare: (research: PublishedResearch) => void;
  copyToClipboard: (text: string, id: string) => void;
  incrementViews: (id: string) => void;
  copied: string | null;
  isAdminView?: boolean;
}> = ({
  research,
  loading,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  categories,
  getCategoryLabel,
  formatDate,
  handleShare,
  copyToClipboard,
  incrementViews,
  copied,
  isAdminView = false
}) => {
  return (
    <>
      {/* Search and Filters */}
      <div className="bg-slate-800/70 rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search research by title, content, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Research Grid */}
      {loading ? (
        <div className="text-center py-12">
          <LoadingSpinner />
          <p className="text-slate-400 mt-4">Loading research...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {research.map((item) => (
            <div
              key={item.id}
              id={`research-${item.id}`}
              className="bg-slate-800/70 rounded-xl border border-slate-700 overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-block px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs font-medium rounded">
                    {getCategoryLabel(item.category)}
                  </span>
                  <div className="flex items-center text-slate-500 text-xs">
                    <EyeIcon className="w-3 h-3 mr-1" />
                    {item.views}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h3>

                <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                  {item.summary}
                </p>

                <div className="mb-4">
                  <ReadMoreLess
                    text={item.content}
                    initialVisibleLines={4}
                    className="text-slate-300 text-sm leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                      +{item.tags.length - 3} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {formatDate(item.publishedDate)}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleShare(item);
                        incrementViews(item.id);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Share research"
                    >
                      {copied === item.id ? (
                        <ClipboardIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <ShareIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {research.length === 0 && !loading && (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No research found</p>
          <p className="text-slate-500 text-sm">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Research will appear here once published'
            }
          </p>
        </div>
      )}
    </>
  );
};