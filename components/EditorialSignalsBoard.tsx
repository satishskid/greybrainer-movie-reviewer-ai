import React, { useMemo, useState } from 'react';
import { Clapperboard, Copy, Sparkles } from 'lucide-react';
import { MovieSuggestion } from '../types';
import { EditorialSignals } from '../services/editorialSignalsService';

interface EditorialSignalsBoardProps {
  signals: EditorialSignals;
  onSelectMovie: (movie: MovieSuggestion) => void;
}

export const EditorialSignalsBoard: React.FC<EditorialSignalsBoardProps> = ({ signals, onSelectMovie }) => {
  const [copiedTopic, setCopiedTopic] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const defaultVisibleTopics = 6;

  const sections = useMemo(() => {
    const mergedMovies = [...signals.newReleases, ...signals.trendingMovies].filter((movie, index, list) => {
      const key = movie.title.trim().toLowerCase();
      return list.findIndex((candidate) => candidate.title.trim().toLowerCase() === key) === index;
    });

    const visibleTopics = showAllTopics
      ? signals.critiqueTopics
      : signals.critiqueTopics.slice(0, defaultVisibleTopics);

    return [
    {
      id: 'starter-movies',
      title: 'Movie Analysis',
      icon: Clapperboard,
      accent: 'emerald',
      hint: 'Use for analysis',
      items: mergedMovies.map((movie) => ({ type: 'movie' as const, movie, label: movie.year ? `${movie.title} (${movie.year})` : movie.title })),
    },
    {
      id: 'starter-topics',
      title: 'Topics',
      icon: Sparkles,
      accent: 'amber',
      hint: copiedTopic ? 'Copied!' : 'Copy for insights',
      items: visibleTopics.map((topic) => ({ type: 'topic' as const, label: topic })),
      totalCount: signals.critiqueTopics.length,
    },
  ];
  }, [signals, copiedTopic, showAllTopics]);

  const handleTopicClick = async (topic: string) => {
    try {
      await navigator.clipboard.writeText(topic);
      setCopiedTopic(topic);
      window.setTimeout(() => setCopiedTopic(null), 1800);
    } catch {
      setCopiedTopic(null);
    }
  };

  const accentStyles: Record<string, { border: string; bg: string; text: string; chip: string; chipBorder: string }> = {
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-900/10',
      text: 'text-emerald-200',
      chip: 'bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-100',
      chipBorder: 'border-emerald-500/30',
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-900/10',
      text: 'text-amber-200',
      chip: 'bg-amber-600/20 hover:bg-amber-600/35 text-amber-100',
      chipBorder: 'border-amber-500/30',
    },
  };

  return (
    <div className="p-6 bg-slate-800/70 rounded-xl shadow-2xl mb-8 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Movie Analysis & Topics</h2>
          <p className="text-sm text-slate-400 mt-1">Editor-curated starters for movie analysis and topic-led research. These are manual defaults, not a live trend feed.</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs text-slate-300">
        Use these as starting points only. Pick a movie to analyze or copy a topic into the research workflow. If anything feels stale, type your own instead.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const style = accentStyles[section.accent];
          return (
            <div key={section.id} className={`p-4 rounded-lg border ${style.border} ${style.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                  <Icon className="w-4 h-4" />
                  <span>{section.title}</span>
                  <span className="text-[11px] text-slate-300 normal-case tracking-normal">({section.id === 'starter-topics' ? section.totalCount : section.items.length})</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  {section.id === 'starter-topics' ? <Copy className="w-3 h-3" /> : null}
                  <span>{section.hint}</span>
                </div>
              </div>

              <div className={`flex ${section.id === 'starter-topics' ? 'flex-col' : 'flex-wrap'} gap-2`}>
                {section.items.map((item, index) => (
                  <button
                    key={`${section.id}-${index}-${item.label}`}
                    type="button"
                    onClick={() => item.type === 'movie' ? onSelectMovie(item.movie) : handleTopicClick(item.label)}
                    className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors text-left ${style.chip} ${style.chipBorder}`}
                    title={item.label}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {section.id === 'starter-topics' && section.totalCount > defaultVisibleTopics ? (
                <button
                  type="button"
                  onClick={() => setShowAllTopics((current) => !current)}
                  className="mt-3 text-xs font-medium text-amber-200 hover:text-amber-100 transition-colors"
                >
                  {showAllTopics ? 'Show fewer topics' : `Show ${section.totalCount - defaultVisibleTopics} more topics`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
