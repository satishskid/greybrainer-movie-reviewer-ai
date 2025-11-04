import React, { useState, useCallback } from 'react';
import { ScaleIcon } from './icons/ScaleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { generateGreybrainerComparisonWithGemini, analyzeMovieMorphokinetics, LogTokenUsageFn } from '../services/geminiService';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ReadMoreLess } from './ReadMoreLess';
import { MorphokineticsAnalysis, MorphokineticMoment } from '../types';
import { MotionIcon } from './icons/MotionIcon';

interface ComparisonItem {
  title: string;
  type: 'Movie' | 'Series' | 'Scene' | 'Artist' | 'Director';
  description?: string;
}

interface GreybrainerComparisonProps {
  logTokenUsage?: LogTokenUsageFn;
}

export const GreybrainerComparison: React.FC<GreybrainerComparisonProps> = ({ logTokenUsage }) => {
  const [item1, setItem1] = useState<ComparisonItem>({ title: '', type: 'Movie' });
  const [item2, setItem2] = useState<ComparisonItem>({ title: '', type: 'Movie' });
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState<boolean>(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Morphokinetics state
  const [morphokinetics1, setMorphokinetics1] = useState<MorphokineticsAnalysis | null>(null);
  const [morphokinetics2, setMorphokinetics2] = useState<MorphokineticsAnalysis | null>(null);
  const [isGeneratingMorphokinetics, setIsGeneratingMorphokinetics] = useState<boolean>(false);
  const [showMorphokinetics, setShowMorphokinetics] = useState<boolean>(false);

  const handleGenerateComparison = useCallback(async () => {
    if (!item1.title.trim() || !item2.title.trim()) {
      setComparisonError('Please enter both items to compare.');
      return;
    }

    setIsGeneratingComparison(true);
    setComparisonError(null);
    setComparisonResult(null);

    try {
      const comparison = await generateGreybrainerComparisonWithGemini(item1, item2, logTokenUsage);
      setComparisonResult(comparison);
    } catch (err) {
      console.error("Failed to generate comparison:", err);
      setComparisonError(err instanceof Error ? err.message : "An unknown error occurred while generating the comparison.");
    } finally {
      setIsGeneratingComparison(false);
    }
  }, [item1, item2, logTokenUsage]);

  const handleGenerateMorphokinetics = useCallback(async () => {
    if (!item1.title.trim() || !item2.title.trim()) {
      setComparisonError('Please enter both movie titles to analyze morphokinetics.');
      return;
    }

    if (item1.type !== 'Movie' || item2.type !== 'Movie') {
      setComparisonError('Morphokinetics analysis is only available for movies.');
      return;
    }

    setIsGeneratingMorphokinetics(true);
    setComparisonError(null);
    setMorphokinetics1(null);
    setMorphokinetics2(null);

    try {
      // Analyze both movies in parallel
      const [morpho1, morpho2] = await Promise.all([
        analyzeMovieMorphokinetics(item1.title, logTokenUsage),
        analyzeMovieMorphokinetics(item2.title, logTokenUsage)
      ]);
      
      setMorphokinetics1(morpho1);
      setMorphokinetics2(morpho2);
      setShowMorphokinetics(true);
    } catch (err) {
      console.error("Failed to generate morphokinetics analysis:", err);
      setComparisonError(err instanceof Error ? err.message : "An unknown error occurred while generating morphokinetics analysis.");
    } finally {
      setIsGeneratingMorphokinetics(false);
    }
  }, [item1, item2, logTokenUsage]);

  const handleCopyComparison = () => {
    if (!comparisonResult) return;
    navigator.clipboard.writeText(comparisonResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(err => {
      console.error('Failed to copy comparison: ', err);
    });
  };

  const typeOptions: ComparisonItem['type'][] = ['Movie', 'Series', 'Scene', 'Artist', 'Director'];

  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex items-center mb-4">
        <ScaleIcon className="w-7 h-7 text-blue-400 mr-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          Greybrainer Comparison Analysis
        </h2>
      </div>
      
      <div className="text-slate-300 text-sm space-y-4">
        <p>
          Compare two movies, scenes, artists, or directors using our advanced AI analysis. Get insights into similarities, differences, and unique characteristics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item 1 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-300">First Item</h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
              <select
                value={item1.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setItem1(prev => ({ ...prev, type: e.target.value as ComparisonItem['type'] }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Title/Name</label>
              <input
                type="text"
                value={item1.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItem1(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`Enter ${item1.type.toLowerCase()} title/name`}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
              <textarea
                value={item1.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setItem1(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional context or specific aspects to focus on"
                rows={2}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Item 2 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-cyan-300">Second Item</h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
              <select
                value={item2.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setItem2(prev => ({ ...prev, type: e.target.value as ComparisonItem['type'] }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Title/Name</label>
              <input
                type="text"
                value={item2.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItem2(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`Enter ${item2.type.toLowerCase()} title/name`}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
              <textarea
                value={item2.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setItem2(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional context or specific aspects to focus on"
                rows={2}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={handleGenerateComparison}
            disabled={isGeneratingComparison || !item1.title.trim() || !item2.title.trim()}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingComparison ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Generating Comparison...</span>
              </>
            ) : (
              <>
                <ScaleIcon className="w-4 h-4 mr-2" />
                Generate Comparison
              </>
            )}
          </button>

          {item1.type === 'Movie' && item2.type === 'Movie' && (
            <button
              onClick={handleGenerateMorphokinetics}
              disabled={isGeneratingMorphokinetics || !item1.title.trim() || !item2.title.trim()}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingMorphokinetics ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Analyzing Motion...</span>
                </>
              ) : (
                <>
                  <MotionIcon className="w-4 h-4 mr-2" />
                  Morphokinetics Analysis
                </>
              )}
            </button>
          )}
        </div>

        {comparisonError && (
          <div className="mt-4 p-3 bg-red-700/30 text-red-300 border border-red-500 rounded-md">
            <strong>Error:</strong> {comparisonError}
          </div>
        )}

        {comparisonResult && !isGeneratingComparison && (
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-200">Comparison Analysis</h3>
              <button
                onClick={handleCopyComparison}
                className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md shadow transition-colors"
                title="Copy comparison analysis"
              >
                <ClipboardIcon className="w-3 h-3 mr-1.5" />
                {copied ? 'Copied!' : 'Copy Analysis'}
              </button>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
              <ReadMoreLess 
                text={comparisonResult} 
                initialVisibleLines={20} 
                className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm" 
              />
            </div>
          </div>
        )}

        {showMorphokinetics && morphokinetics1 && morphokinetics2 && (
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <div className="flex items-center mb-6">
              <MotionIcon className="w-6 h-6 text-teal-400 mr-3" />
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                Visual Comparison Analysis
              </h3>
            </div>
            
            {/* Two Clean Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Combined Morphokinetics Chart */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-teal-500/30">
                <h4 className="text-lg font-semibold text-teal-300 mb-4 text-center">
                  🌊 Morphokinetics Flow Comparison
                </h4>
                <CombinedMorphokineticsChart 
                  analysis1={morphokinetics1}
                  analysis2={morphokinetics2}
                  title1={item1.title}
                  title2={item2.title}
                />
              </div>

              {/* Three-Layer Comparison Chart */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/30">
                <h4 className="text-lg font-semibold text-purple-300 mb-4 text-center">
                  🎭 Three-Layer Analysis Comparison
                </h4>
                <ThreeLayerComparisonChart 
                  item1={item1}
                  item2={item2}
                />
              </div>
            </div>

            {/* Clean Summary Section */}
            <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-6 border border-slate-600/50">
              <h4 className="text-xl font-semibold text-slate-200 mb-4 text-center">
                📋 Comparative Analysis Summary
              </h4>
              <div className="prose prose-invert max-w-none">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <h5 className="font-semibold text-blue-300 text-base">{item1.title}</h5>
                    <div className="text-slate-300 leading-relaxed">
                      <p><strong>Narrative Flow:</strong> {morphokinetics1.overallSummary}</p>
                      <p className="mt-2"><strong>Structure:</strong> {morphokinetics1.timelineStructureNotes}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-semibold text-cyan-300 text-base">{item2.title}</h5>
                    <div className="text-slate-300 leading-relaxed">
                      <p><strong>Narrative Flow:</strong> {morphokinetics2.overallSummary}</p>
                      <p className="mt-2"><strong>Structure:</strong> {morphokinetics2.timelineStructureNotes}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-500 italic">
          <p>
            Comparison analysis is powered by AI and provides subjective insights for creative and analytical purposes. 
            Results may vary and should be used as a starting point for deeper discussion.
          </p>
        </div>
      </div>
    </div>
  );
};

// Combined Morphokinetics Chart Component
interface CombinedMorphokineticsChartProps {
  analysis1: MorphokineticsAnalysis;
  analysis2: MorphokineticsAnalysis;
  title1: string;
  title2: string;
}

const CombinedMorphokineticsChart: React.FC<CombinedMorphokineticsChartProps> = ({ 
  analysis1, analysis2, title1, title2 
}) => {
  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 300;
  const MARGIN = 50;

  if (!analysis1.keyMoments?.length || !analysis2.keyMoments?.length) {
    return (
      <div className="text-center text-slate-400 py-12">
        Insufficient morphokinetics data for comparison
      </div>
    );
  }

  // Create paths for both movies
  const createPath = (moments: MorphokineticMoment[]) => {
    return moments
      .map((moment, index) => {
        const x = MARGIN + (moment.time * (SVG_WIDTH - 2 * MARGIN));
        const y = SVG_HEIGHT - MARGIN - (moment.intensityScore / 10 * (SVG_HEIGHT - 2 * MARGIN));
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const path1 = createPath(analysis1.keyMoments);
  const path2 = createPath(analysis2.keyMoments);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 p-4 rounded-lg">
        <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 2, 4, 6, 8, 10].map(intensity => {
            const y = SVG_HEIGHT - MARGIN - (intensity / 10 * (SVG_HEIGHT - 2 * MARGIN));
            return (
              <line
                key={intensity}
                x1={MARGIN}
                y1={y}
                x2={SVG_WIDTH - MARGIN}
                y2={y}
                stroke="rgb(71 85 105)"
                strokeWidth="0.5"
                opacity="0.3"
              />
            );
          })}

          {/* Movie 1 line */}
          <path
            d={path1}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            opacity="0.8"
          />

          {/* Movie 2 line */}
          <path
            d={path2}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
            opacity="0.8"
          />

          {/* Data points for Movie 1 */}
          {analysis1.keyMoments.map((moment, index) => {
            const x = MARGIN + (moment.time * (SVG_WIDTH - 2 * MARGIN));
            const y = SVG_HEIGHT - MARGIN - (moment.intensityScore / 10 * (SVG_HEIGHT - 2 * MARGIN));
            
            return (
              <g key={`m1-${index}`}>
                <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                {moment.isTwist && (
                  <text x={x} y={y - 12} textAnchor="middle" className="fill-yellow-400 text-xs">⚡</text>
                )}
              </g>
            );
          })}

          {/* Data points for Movie 2 */}
          {analysis2.keyMoments.map((moment, index) => {
            const x = MARGIN + (moment.time * (SVG_WIDTH - 2 * MARGIN));
            const y = SVG_HEIGHT - MARGIN - (moment.intensityScore / 10 * (SVG_HEIGHT - 2 * MARGIN));
            
            return (
              <g key={`m2-${index}`}>
                <circle cx={x} cy={y} r="4" fill="#06b6d4" />
                {moment.isTwist && (
                  <text x={x} y={y - 12} textAnchor="middle" className="fill-yellow-400 text-xs">⚡</text>
                )}
              </g>
            );
          })}

          {/* Axes */}
          <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={SVG_HEIGHT - MARGIN} stroke="rgb(148 163 184)" strokeWidth="2"/>
          <line x1={MARGIN} y1={SVG_HEIGHT - MARGIN} x2={SVG_WIDTH - MARGIN} y2={SVG_HEIGHT - MARGIN} stroke="rgb(148 163 184)" strokeWidth="2"/>
          
          {/* Y-axis labels */}
          {[0, 5, 10].map(intensity => {
            const y = SVG_HEIGHT - MARGIN - (intensity / 10 * (SVG_HEIGHT - 2 * MARGIN));
            return (
              <text key={intensity} x={MARGIN - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-xs">
                {intensity}
              </text>
            );
          })}
          
          {/* Labels */}
          <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 10} textAnchor="middle" className="fill-slate-300 text-sm font-medium">
            Narrative Timeline
          </text>
          <text x={20} y={SVG_HEIGHT / 2} textAnchor="middle" className="fill-slate-300 text-sm font-medium" transform={`rotate(-90 20 ${SVG_HEIGHT / 2})`}>
            Intensity
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-blue-400 mr-2"></div>
          <span className="text-blue-300">{title1}</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-cyan-400 mr-2"></div>
          <span className="text-cyan-300">{title2}</span>
        </div>
        <div className="flex items-center">
          <span className="text-yellow-400 mr-1">⚡</span>
          <span className="text-slate-400">Plot Twists</span>
        </div>
      </div>
    </div>
  );
};

// Three-Layer Comparison Chart Component
interface ThreeLayerComparisonChartProps {
  item1: ComparisonItem;
  item2: ComparisonItem;
}

const ThreeLayerComparisonChart: React.FC<ThreeLayerComparisonChartProps> = ({ item1, item2 }) => {
  // Mock data for demonstration - in real implementation, this would come from actual analysis
  const layers = ['Story', 'Conceptualization', 'Performance'];
  const mockScores1 = [8.5, 7.2, 9.1]; // Mock scores for item1
  const mockScores2 = [7.8, 8.9, 7.5]; // Mock scores for item2

  const SVG_SIZE = 280;
  const CENTER = SVG_SIZE / 2;
  const MAX_RADIUS = 100;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 p-4 rounded-lg flex justify-center">
        <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          {/* Background circles */}
          {[0.3, 0.6, 1.0].map((scale, index) => (
            <circle
              key={index}
              cx={CENTER}
              cy={CENTER}
              r={MAX_RADIUS * scale}
              fill="none"
              stroke="rgb(71 85 105)"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

          {/* Item 1 - Blue */}
          {layers.map((layer, index) => {
            const angle = (index * 120 - 90) * (Math.PI / 180);
            const score = mockScores1[index];
            const radius = (score / 10) * MAX_RADIUS;
            const x = CENTER + Math.cos(angle) * radius;
            const y = CENTER + Math.sin(angle) * radius;
            
            return (
              <g key={`item1-${index}`}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke="#3b82f6"
                  strokeWidth="3"
                  opacity="0.7"
                />
                <circle cx={x} cy={y} r="6" fill="#3b82f6" />
                <text
                  x={CENTER + Math.cos(angle) * (MAX_RADIUS + 20)}
                  y={CENTER + Math.sin(angle) * (MAX_RADIUS + 20)}
                  textAnchor="middle"
                  className="fill-slate-300 text-xs font-medium"
                >
                  {layer}
                </text>
              </g>
            );
          })}

          {/* Item 2 - Cyan */}
          {layers.map((layer, index) => {
            const angle = (index * 120 - 90) * (Math.PI / 180);
            const score = mockScores2[index];
            const radius = (score / 10) * MAX_RADIUS;
            const x = CENTER + Math.cos(angle) * radius;
            const y = CENTER + Math.sin(angle) * radius;
            
            return (
              <g key={`item2-${index}`}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke="#06b6d4"
                  strokeWidth="3"
                  opacity="0.7"
                  strokeDasharray="5,5"
                />
                <circle cx={x} cy={y} r="6" fill="#06b6d4" />
              </g>
            );
          })}

          {/* Center point */}
          <circle cx={CENTER} cy={CENTER} r="4" fill="rgb(148 163 184)" />
        </svg>
      </div>

      {/* Legend and Scores */}
      <div className="space-y-3">
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-blue-400 mr-2"></div>
            <span className="text-blue-300">{item1.title}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-cyan-400 mr-2 border-dashed border-t-2 border-cyan-400 bg-transparent"></div>
            <span className="text-cyan-300">{item2.title}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          {layers.map((layer, index) => (
            <div key={layer} className="bg-slate-800/50 p-2 rounded">
              <div className="font-medium text-slate-300 mb-1">{layer}</div>
              <div className="text-blue-300">{mockScores1[index]}</div>
              <div className="text-cyan-300">{mockScores2[index]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};