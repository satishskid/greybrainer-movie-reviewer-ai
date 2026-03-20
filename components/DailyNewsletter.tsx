import React, { useState, useCallback } from 'react';
import { generateDailyNewsletter, LogTokenUsageFn } from '../services/geminiService';
import { fetchPastNewslettersContext, saveDailyNewsletter } from '../services/newsletterService';
import { LoadingSpinner } from './LoadingSpinner';
import { Newspaper, Send, Mail, Copy, Download, MessageCircle, FileCode } from 'lucide-react';
import { ReadMoreLess } from './ReadMoreLess';

interface DailyNewsletterProps {
  logTokenUsage?: LogTokenUsageFn;
}

export const DailyNewsletter: React.FC<DailyNewsletterProps> = ({ logTokenUsage }) => {
  const [dailyNewsletter, setDailyNewsletter] = useState<{title: string, themes: string, content: string} | null>(null);
  const [isGeneratingNewsletter, setIsGeneratingNewsletter] = useState<boolean>(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [copiedNewsletter, setCopiedNewsletter] = useState<string | null>(null);

  const handleGenerateDailyNewsletter = useCallback(async () => {
    if (isGeneratingNewsletter) return;

    setIsGeneratingNewsletter(true);
    setNewsletterError(null);
    setDailyNewsletter(null);
    try {
      const pastContext = await fetchPastNewslettersContext(7);
      const newsletter = await generateDailyNewsletter(pastContext, logTokenUsage);
      setDailyNewsletter(newsletter);
      
      const todayStr = new Date().toISOString().split('T')[0];
      await saveDailyNewsletter(todayStr, newsletter.title, newsletter.themes, newsletter.content);
      
    } catch (err) {
      console.error("Failed to generate daily newsletter:", err);
      setNewsletterError(err instanceof Error ? err.message : "An unknown error occurred while generating the daily newsletter.");
    } finally {
      setIsGeneratingNewsletter(false);
    }
  }, [isGeneratingNewsletter, logTokenUsage]);

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

  const handleShareWhatsApp = () => {
    if (!dailyNewsletter) return;
    const text = `*${dailyNewsletter.title}*\n\n${dailyNewsletter.content}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    if (!dailyNewsletter) return;
    const text = `*${dailyNewsletter.title}*\n\n${dailyNewsletter.content}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://greybrainer.ai')}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!dailyNewsletter) return;
    const subject = dailyNewsletter.title;
    const body = dailyNewsletter.content;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
                
                <div className="flex-1"></div>
                
                {/* Social Share Group */}
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center p-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] rounded-md transition-colors"
                  title="Share to WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShareTelegram}
                  className="flex items-center justify-center p-2 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-[#0088cc] rounded-md transition-colors"
                  title="Share to Telegram"
                >
                  <Send className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShareEmail}
                  className="flex items-center justify-center p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-md transition-colors"
                  title="Send via Email"
                >
                  <Mail className="w-5 h-5" />
                </button>
              </div>
              
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
