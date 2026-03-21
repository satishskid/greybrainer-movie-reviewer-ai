import React, { useState, useCallback } from 'react';
import { generateDailyNewsletter, generateDistributionPackForNewsletter, LogTokenUsageFn } from '../services/geminiService';
import { fetchPastNewslettersContext, saveDailyNewsletter, saveNewsletterDistributionPack } from '../services/newsletterService';
import { LoadingSpinner } from './LoadingSpinner';
import { Newspaper, Copy, Download, FileCode } from 'lucide-react';
import { ReadMoreLess } from './ReadMoreLess';
import { DistributionPack, MovieSuggestion } from '../types';

interface DailyNewsletterProps {
  logTokenUsage?: LogTokenUsageFn;
  onNewsletterSuggestionsUpdated?: (data: { movies: MovieSuggestion[]; topics: string[] }) => void;
}

export const DailyNewsletter: React.FC<DailyNewsletterProps> = ({ logTokenUsage, onNewsletterSuggestionsUpdated }) => {
  const [dailyNewsletter, setDailyNewsletter] = useState<{title: string, themes: string, content: string, suggestedReviews: MovieSuggestion[], suggestedResearchTopics: string[]} | null>(null);
  const [newsletterDateStr, setNewsletterDateStr] = useState<string>('');
  const [isGeneratingNewsletter, setIsGeneratingNewsletter] = useState<boolean>(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [copiedNewsletter, setCopiedNewsletter] = useState<string | null>(null);
  const [distributionPack, setDistributionPack] = useState<DistributionPack | null>(null);
  const [isGeneratingPack, setIsGeneratingPack] = useState<boolean>(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [copiedPack, setCopiedPack] = useState<string | null>(null);

  const handleGenerateDailyNewsletter = useCallback(async () => {
    if (isGeneratingNewsletter) return;

    setIsGeneratingNewsletter(true);
    setNewsletterError(null);
    setDailyNewsletter(null);
    setDistributionPack(null);
    setPackError(null);
    try {
      const pastContext = await fetchPastNewslettersContext(7);
      const newsletter = await generateDailyNewsletter(pastContext, logTokenUsage);
      setDailyNewsletter(newsletter);
      
      const todayStr = new Date().toISOString().split('T')[0];
      setNewsletterDateStr(todayStr);
      await saveDailyNewsletter(
        todayStr,
        newsletter.title,
        newsletter.themes,
        newsletter.content,
        newsletter.suggestedReviews,
        newsletter.suggestedResearchTopics
      );
      onNewsletterSuggestionsUpdated?.({ movies: newsletter.suggestedReviews, topics: newsletter.suggestedResearchTopics });
      
    } catch (err) {
      console.error("Failed to generate daily newsletter:", err);
      setNewsletterError(err instanceof Error ? err.message : "An unknown error occurred while generating the daily newsletter.");
    } finally {
      setIsGeneratingNewsletter(false);
    }
  }, [isGeneratingNewsletter, logTokenUsage, onNewsletterSuggestionsUpdated]);

  const setCopiedPackState = (type: string) => {
    setCopiedPack(type);
    setTimeout(() => setCopiedPack(null), 2500);
  };

  const setCopiedState = (type: string) => {
    setCopiedNewsletter(type);
    setTimeout(() => setCopiedNewsletter(null), 2500);
  };

  const handleCopyMarkdown = () => {
    if (!dailyNewsletter) return;
    navigator.clipboard.writeText(`# ${dailyNewsletter.title}\n\n${dailyNewsletter.content}`).then(() => {
        setCopiedState('md');
    }).catch(err => console.error('Failed to copy md: ', err));
  };

  const handleCopyHtml = () => {
    if (!dailyNewsletter) return;
    // Simple basic regex parser for quick HTML rendering
    let htmlContent = `# ${dailyNewsletter.title}\n\n${dailyNewsletter.content}`;
    htmlContent = htmlContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '<p></p>')
      .replace(/<p><\/p>/g, '<br/>');

    const container = document.createElement('div');
    container.innerHTML = htmlContent;

    const listener = (e: ClipboardEvent) => {
      e.clipboardData?.setData('text/html', container.innerHTML);
      e.clipboardData?.setData('text/plain', container.innerText);
      e.preventDefault();
    };
    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
    setCopiedState('html');
  };

  const handleDownloadNewsletter = () => {
    if (!dailyNewsletter) return;
    const markdownContent = `# ${dailyNewsletter.title}\n\n${dailyNewsletter.content}`; 
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = new Date().toISOString().split('T')[0];
    link.download = `daily_newsletter_${safeName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateDistributionPack = useCallback(async () => {
    if (!dailyNewsletter || isGeneratingPack) return;
    setIsGeneratingPack(true);
    setPackError(null);
    try {
      const pack = await generateDistributionPackForNewsletter(dailyNewsletter, logTokenUsage);
      setDistributionPack(pack);
      if (newsletterDateStr) {
        await saveNewsletterDistributionPack(newsletterDateStr, pack);
      }
    } catch (err) {
      console.error('Failed to generate distribution pack:', err);
      setPackError(err instanceof Error ? err.message : 'An unknown error occurred while generating the distribution pack.');
    } finally {
      setIsGeneratingPack(false);
    }
  }, [dailyNewsletter, isGeneratingPack, logTokenUsage, newsletterDateStr]);

  const handleCopyPackJson = () => {
    if (!distributionPack) return;
    navigator.clipboard.writeText(JSON.stringify(distributionPack, null, 2)).then(() => {
      setCopiedPackState('json');
    }).catch(err => console.error('Failed to copy pack json: ', err));
  };

  const handleCopyLinkedIn = () => {
    if (!distributionPack) return;
    navigator.clipboard.writeText(distributionPack.linkedinPost).then(() => {
      setCopiedPackState('li');
    }).catch(err => console.error('Failed to copy linkedin: ', err));
  };

  const handleCopyTwitterThread = () => {
    if (!distributionPack) return;
    navigator.clipboard.writeText(distributionPack.twitterThread.join('\n\n')).then(() => {
      setCopiedPackState('x');
    }).catch(err => console.error('Failed to copy twitter thread: ', err));
  };

  const handleDownloadPackJson = () => {
    if (!distributionPack) return;
    const blob = new Blob([JSON.stringify(distributionPack, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = newsletterDateStr || new Date().toISOString().split('T')[0];
    link.download = `distribution_pack_${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-10 mb-8 border border-emerald-500/30 overflow-hidden transform transition-all duration-300">
      <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
        <h2 className="text-3xl font-extrabold text-white flex items-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
          <Newspaper className="w-8 h-8 mr-3 text-emerald-400" />
          The Daily Editorial
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 border-r border-slate-700/50 pr-0 lg:pr-8">
          <h3 className="text-xl font-bold text-white mb-3">Ground Control</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Generate today's curated newsletter draft. The AI searches live trends across the Indian film ecosystem, 
            blending the newest ecosystem signals with context from our last 7 days of editorial.
          </p>

          <button
            onClick={handleGenerateDailyNewsletter}
            disabled={isGeneratingNewsletter}
            className="w-full flex items-center justify-center p-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-900/40 hover:-translate-y-1"
          >
            {isGeneratingNewsletter ? (
              <>
                <LoadingSpinner />
                <span className="ml-3">Researching & Grounding...</span>
              </>
            ) : (
              <>
                <Newspaper className="w-6 h-6 mr-2" />
                Draft Today's Edition
              </>
            )}
          </button>

          {newsletterError && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
              <span className="font-bold flex items-center mb-1">
                <span className="mr-2">⚠️</span> System Error
              </span>
              {newsletterError}
            </div>
          )}
        </div>

        <div className="col-span-1 lg:col-span-2 relative min-h-[400px]">
          {dailyNewsletter ? (
            <div className="animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-100">{dailyNewsletter.title}</h3>
                  <div className="flex items-center mt-2 space-x-2">
                    <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 text-xs font-medium rounded-full border border-emerald-700/50">
                      SEO Keywords
                    </span>
                    <span className="text-slate-400 text-xs truncate max-w-[300px]" title={dailyNewsletter.themes}>
                      {dailyNewsletter.themes}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-900/60 p-2 rounded-lg border border-slate-700">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2 pr-4 mr-2 border-r border-slate-700">HITL Export</div>
                
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-md transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedNewsletter === 'md' ? 'Copied MD!' : 'Copy MD'}
                </button>
                <button
                  onClick={handleCopyHtml}
                  className="flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-md transition-colors"
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  {copiedNewsletter === 'html' ? 'Copied HTML!' : 'Copy HTML'}
                </button>
                <button
                  onClick={handleDownloadNewsletter}
                  className="flex items-center px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-sm font-medium rounded-md transition-colors mr-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={handleGenerateDistributionPack}
                  disabled={isGeneratingPack}
                  className="flex items-center px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPack ? <><LoadingSpinner size="sm" /><span className="ml-2">Generating Pack...</span></> : <><FileCode className="w-4 h-4 mr-2" />SEO + Social Pack</>}
                </button>
              </div>

              {packError && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  <span className="font-bold flex items-center mb-1">
                    <span className="mr-2">⚠️</span> Distribution Pack Error
                  </span>
                  {packError}
                </div>
              )}

              {distributionPack && (
                <div className="mb-6 p-4 bg-slate-900/60 rounded-xl border border-emerald-500/20">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-emerald-200">SEO + Social Distribution Pack</div>
                      <div className="text-xs text-slate-400">
                        Primary keyword: <span className="text-slate-200">{distributionPack.primaryKeyword}</span> • Slug: <span className="text-slate-200">{distributionPack.slug}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleCopyPackJson}
                        className="flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md shadow transition-colors"
                      >
                        <Copy className="w-3 h-3 mr-1.5" />
                        {copiedPack === 'json' ? 'Copied JSON!' : 'Copy JSON'}
                      </button>
                      <button
                        onClick={handleCopyLinkedIn}
                        className="flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md shadow transition-colors"
                      >
                        <Copy className="w-3 h-3 mr-1.5" />
                        {copiedPack === 'li' ? 'Copied LinkedIn!' : 'Copy LinkedIn'}
                      </button>
                      <button
                        onClick={handleCopyTwitterThread}
                        className="flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md shadow transition-colors"
                      >
                        <Copy className="w-3 h-3 mr-1.5" />
                        {copiedPack === 'x' ? 'Copied Thread!' : 'Copy X Thread'}
                      </button>
                      <button
                        onClick={handleDownloadPackJson}
                        className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                      >
                        <Download className="w-3 h-3 mr-1.5" />
                        Download JSON
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                      <div className="text-xs font-semibold text-slate-300 mb-2">Headlines</div>
                      <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                        {distributionPack.headlines.slice(0, 5).map((h, i) => <li key={`h-${i}`}>{h}</li>)}
                      </ul>
                    </div>
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                      <div className="text-xs font-semibold text-slate-300 mb-2">Hashtags</div>
                      <div className="text-sm text-slate-200 whitespace-pre-wrap">
                        {distributionPack.hashtags.slice(0, 12).join(' ')}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700 lg:col-span-2">
                      <div className="text-xs font-semibold text-slate-300 mb-2">Posting Plan</div>
                      <div className="space-y-2">
                        {distributionPack.postingPlan.slice(0, 6).map((p, i) => (
                          <div key={`pp-${i}`} className="text-sm text-slate-200">
                            <span className="text-emerald-200 font-semibold">{p.platform}</span>
                            <span className="text-slate-400"> • {p.bestTimeLocal}</span>
                            <div className="text-xs text-slate-300">{p.postType} — {p.goal}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(dailyNewsletter.suggestedReviews?.length > 0 || dailyNewsletter.suggestedResearchTopics?.length > 0) && (
                <div className="mb-6 p-4 bg-slate-900/60 rounded-xl border border-emerald-500/20">
                  <div className="text-xs font-semibold text-emerald-200 uppercase tracking-wider mb-3">Next Actions (Auto-Extracted)</div>
                  {dailyNewsletter.suggestedReviews?.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-slate-200 mb-2">Suggested Reviews</div>
                      <div className="space-y-2">
                        {dailyNewsletter.suggestedReviews.slice(0, 6).map((m, idx) => (
                          <div key={`nr-${idx}-${m.title}`} className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                            <div className="text-slate-100 font-medium">
                              {m.year ? `${m.title} (${m.year})` : m.title}
                              {m.type ? <span className="ml-2 text-xs text-slate-400">{m.type}</span> : null}
                            </div>
                            {m.description ? <div className="text-xs text-slate-400 mt-1">{m.description}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dailyNewsletter.suggestedResearchTopics?.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-slate-200 mb-2">Suggested Research Topics</div>
                      <div className="flex flex-wrap gap-2">
                        {dailyNewsletter.suggestedResearchTopics.slice(0, 10).map((t, idx) => (
                          <span key={`rt-${idx}`} className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-200 border border-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-6 md:p-8 bg-slate-900/80 rounded-xl border border-slate-700/80 shadow-inner">
                <div className="text-slate-200 whitespace-pre-wrap leading-loose text-base gb-content-area prose prose-invert prose-emerald max-w-none">
                  <ReadMoreLess
                    text={dailyNewsletter.content}
                    initialVisibleLines={25}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-900/20">
              <Newspaper className="w-16 h-16 text-slate-600 mb-4 opacity-50" />
              <p className="text-lg font-medium">No Newsletter Generated Yet</p>
              <p className="text-sm mt-2 max-w-sm">Hit the draft button to compile today's narrative from live market signals.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
