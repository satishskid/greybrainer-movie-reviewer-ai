import React, { useState } from 'react';
import { Copy, Twitter, Linkedin, Instagram, Youtube, Layout, Share2, Sparkles, MessageSquare, Clock, Target, ExternalLink, Image as ImageIcon, ChevronRight, ChevronLeft, Split } from 'lucide-react';
import { DistributionPack, CarouselSlide } from '../types';

interface SocialDistributionDashboardProps {
  distributionPack: DistributionPack;
}

export const SocialDistributionDashboard: React.FC<SocialDistributionDashboardProps> = ({ distributionPack }) => {
  const [activePlatform, setActivePlatform] = useState<string>(distributionPack.postingPlan[0]?.platform || 'LinkedIn');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
    }).catch(err => console.error('Failed to copy: ', err));
  };

  const currentPost = distributionPack.postingPlan.find(p => p.platform === activePlatform);

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header with Voice DNA */}
      <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/40">
        <div className="flex items-center">
          <Share2 className="w-5 h-5 text-indigo-400 mr-2" />
          <h3 className="text-lg font-bold text-white">Social Distribution Dashboard</h3>
        </div>
        {distributionPack.voiceDNA && (
          <div className="flex items-center px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 mr-2" />
            <span className="text-xs font-medium text-indigo-300">Voice DNA: {distributionPack.voiceDNA}</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 border-r border-slate-700 bg-slate-900/20">
          <div className="p-2 space-y-1">
            {['X', 'LinkedIn', 'Instagram', 'YouTube', 'Carousel', 'A/B Testing'].map((platform) => {
              const Icon = platform === 'X' ? Twitter : 
                           platform === 'LinkedIn' ? Linkedin : 
                           platform === 'Instagram' ? Instagram : 
                           platform === 'YouTube' ? Youtube : 
                           platform === 'A/B Testing' ? Split : Layout;
              
              const isAvailable = platform === 'Carousel' 
                ? !!distributionPack.carouselPlan?.length 
                : platform === 'A/B Testing'
                ? !!distributionPack.abTesting
                : distributionPack.postingPlan.some(p => p.platform === platform);

              if (!isAvailable) return null;

              return (
                <button
                  key={platform}
                  onClick={() => setActivePlatform(platform)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activePlatform === platform 
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-900/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {platform}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 p-6 bg-slate-900/10">
          {activePlatform === 'Carousel' && distributionPack.carouselPlan ? (
            <CarouselPreview slides={distributionPack.carouselPlan} onCopy={handleCopy} copiedStates={copiedStates} />
          ) : activePlatform === 'A/B Testing' && distributionPack.abTesting ? (
            <ABTestingView abTesting={distributionPack.abTesting} onCopy={handleCopy} copiedStates={copiedStates} />
          ) : currentPost ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Post Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-500/30 mr-3">
                    {activePlatform === 'X' ? <Twitter className="w-5 h-5 text-indigo-400" /> : 
                     activePlatform === 'LinkedIn' ? <Linkedin className="w-5 h-5 text-indigo-400" /> : 
                     activePlatform === 'Instagram' ? <Instagram className="w-5 h-5 text-indigo-400" /> : 
                     <Youtube className="w-5 h-5 text-indigo-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{activePlatform} Strategy</div>
                    <div className="text-sm font-bold text-slate-100">{currentPost.handle || 'GreyBrainer AI'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">
                    <Clock className="w-3 h-3 mr-1.5" />
                    Best Time: {currentPost.bestTimeLocal}
                  </div>
                  <div className="flex items-center px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">
                    <Target className="w-3 h-3 mr-1.5" />
                    Goal: {currentPost.goal}
                  </div>
                </div>
              </div>

              {/* Post Copy */}
              <div className="relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(currentPost.copy, `post-${activePlatform}`)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 shadow-xl flex items-center text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {copiedStates[`post-${activePlatform}`] ? 'Copied!' : 'Copy Post'}
                  </button>
                </div>
                <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-700 text-slate-300 whitespace-pre-wrap font-sans leading-relaxed text-sm min-h-[200px]">
                  {currentPost.copy}
                </div>
              </div>

              {/* Hashtags Section */}
              {distributionPack.hashtags.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Optimized Hashtags</div>
                  <div className="flex flex-wrap gap-2">
                    {distributionPack.hashtags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-800 text-indigo-300 text-xs rounded border border-slate-700">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                    <button
                      onClick={() => handleCopy(distributionPack.hashtags.join(' '), 'hashtags')}
                      className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center"
                    >
                      <Copy className="w-3 h-3 mr-1.5" />
                      {copiedStates['hashtags'] ? 'Copied Tags!' : 'Copy All Tags'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Select a platform to view strategy</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ABTestingViewProps {
  abTesting: NonNullable<DistributionPack['abTesting']>;
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

const ABTestingView: React.FC<ABTestingViewProps> = ({ abTesting, onCopy, copiedStates }) => {
  return (
    <div className="space-y-8 animate-fadeIn text-slate-200">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30 mr-3">
          <Split className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content Experimentation</div>
          <h3 className="text-sm font-bold text-slate-100">A/B Testing Variants</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Version A */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-bold text-blue-400 uppercase tracking-widest">
              Variant A: {abTesting.versionA.strategy}
            </div>
            <button
              onClick={() => onCopy(abTesting.versionA.copy, 'variant-a')}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest flex items-center"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copiedStates['variant-a'] ? 'Copied' : 'Copy Copy'}
            </button>
          </div>
          
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hook</div>
              <div className="text-sm font-bold text-white italic">"{abTesting.versionA.hook}"</div>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
              {abTesting.versionA.copy}
            </div>
          </div>
        </div>

        {/* Version B */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-400 uppercase tracking-widest">
              Variant B: {abTesting.versionB.strategy}
            </div>
            <button
              onClick={() => onCopy(abTesting.versionB.copy, 'variant-b')}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest flex items-center"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copiedStates['variant-b'] ? 'Copied' : 'Copy Copy'}
            </button>
          </div>
          
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hook</div>
              <div className="text-sm font-bold text-white italic">"{abTesting.versionB.hook}"</div>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
              {abTesting.versionB.copy}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-start">
        <Sparkles className="w-4 h-4 text-indigo-400 mr-3 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <strong>Strategic Tip:</strong> Publish Variant A to your primary audience and Variant B to a secondary segment or at a different peak time. Track the CTR and engagement rates to refine your Brand Voice DNA for future generations.
        </div>
      </div>
    </div>
  );
};

interface CarouselPreviewProps {
  slides: CarouselSlide[];
  onCopy: (text: string, key: string) => void;
  copiedStates: Record<string, boolean>;
}

const CarouselPreview: React.FC<CarouselPreviewProps> = ({ slides, onCopy, copiedStates }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const slide = slides[currentSlideIndex];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="p-2 bg-emerald-600/20 rounded-lg border border-emerald-500/30 mr-3">
            <Layout className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-Slide Carousel</div>
            <div className="text-sm font-bold text-slate-100">{slides.length} Slide Deck</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            className="p-1.5 bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-medium text-slate-400">Slide {currentSlideIndex + 1} of {slides.length}</span>
          <button
            onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-1.5 bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visual Mockup (Simulated) */}
        <div className="aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col p-8 relative">
          {/* Brand Logo Placeholder */}
          <div className="flex items-center mb-12">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center mr-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tighter text-white uppercase">GreyBrainer AI</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h4 className="text-2xl font-black text-white leading-tight mb-4 uppercase italic">
              {slide.headline}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              {slide.bodyText}
            </p>
          </div>

          <div className="mt-auto flex justify-between items-end">
             <div className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">@greybrainer.ai</div>
             <div className="text-[10px] text-slate-500 font-medium">Slide {slide.slideNumber}</div>
          </div>

          {/* Style indicator */}
          <div className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 bg-indigo-500/20 rounded text-indigo-400 font-bold uppercase tracking-widest">
            {slide.overlayStyle || 'Center-Bold'}
          </div>
        </div>

        {/* Technical Data for Creators */}
        <div className="space-y-6 flex flex-col">
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                  <MessageSquare className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                  Slide Copy
                </label>
                <button
                  onClick={() => onCopy(`${slide.headline}\n\n${slide.bodyText}`, `slide-copy-${slide.slideNumber}`)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest flex items-center"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copiedStates[`slide-copy-${slide.slideNumber}`] ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-sm text-slate-300 min-h-[80px]">
                <div className="font-bold text-white mb-1">{slide.headline}</div>
                {slide.bodyText}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                  <ImageIcon className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                  AI Visual Prompt
                </label>
                <button
                  onClick={() => onCopy(slide.visualPrompt, `slide-prompt-${slide.slideNumber}`)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest flex items-center"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copiedStates[`slide-prompt-${slide.slideNumber}`] ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-3 bg-emerald-900/10 rounded-lg border border-emerald-500/20 text-xs text-emerald-100/70 italic leading-relaxed min-h-[80px]">
                {slide.visualPrompt}
              </div>
            </div>
          </div>

          <button
             onClick={() => onCopy(slides.map(s => `SLIDE ${s.slideNumber}:\nHeadline: ${s.headline}\nBody: ${s.bodyText}\nPrompt: ${s.visualPrompt}`).join('\n\n---\n\n'), 'all-slides')}
             className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center group"
          >
            <Copy className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            {copiedStates['all-slides'] ? 'All Slides Copied!' : 'Copy Complete Deck Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
