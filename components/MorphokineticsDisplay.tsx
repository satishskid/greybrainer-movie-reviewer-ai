
import React from 'react';
import { MorphokineticsAnalysis, MorphokineticMoment } from '../types';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon'; // For twists
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon'; // For pacing shifts

interface MorphokineticsDisplayProps {
  analysis: MorphokineticsAnalysis;
  className?: string;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 350;
const MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const Tooltip: React.FC<{ moment: MorphokineticMoment, x: number, y: number }> = ({ moment, x, y }) => {
  const tooltipWidth = 200;
  const tooltipHeight = 100; // Approximate
  const offsetX = (x + tooltipWidth > SVG_WIDTH - MARGIN.right) ? x - tooltipWidth - 10 : x + 10;
  const offsetY = (y - tooltipHeight < MARGIN.top) ? y + 10 : y - tooltipHeight - 5;

  return (
    <g transform={`translate(${offsetX}, ${offsetY})`} className="pointer-events-none">
      <rect width={tooltipWidth} height={tooltipHeight} rx="5" ry="5" fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />
      <text x="10" y="20" fontSize="10px" fill="#cbd5e1" className="font-semibold">
        Time: {moment.time.toFixed(2)} | Intensity: {moment.intensityScore}/10
      </text>
      <text x="10" y="35" fontSize="10px" fill="#94a3b8">
        Emotion: {moment.dominantEmotion} (Val: {moment.emotionalValence})
      </text>
      <foreignObject x="5" y="45" width={tooltipWidth - 10} height={tooltipHeight - 50}>
         <div className="text-xs text-slate-300 p-1 break-words overflow-y-auto max-h-[50px] custom-scrollbar">
            {moment.eventDescription}
         </div>
      </foreignObject>
    </g>
  );
};


export const MorphokineticsDisplay: React.FC<MorphokineticsDisplayProps> = ({ analysis, className = '' }) => {
  const [hoveredMoment, setHoveredMoment] = React.useState<MorphokineticMoment | null>(null);
  const [hoveredPosition, setHoveredPosition] = React.useState<{x:number, y:number} | null>(null);

  if (!analysis || !analysis.keyMoments || analysis.keyMoments.length === 0) {
    return (
      <div className={`p-6 text-slate-400 italic text-center ${className}`}>
        No Morphokinetics data available for display.
      </div>
    );
  }

  const { overallSummary, timelineStructureNotes, keyMoments } = analysis;

  const xScale = (time: number) => MARGIN.left + time * CHART_WIDTH;
  const yScale = (intensity: number) => MARGIN.top + CHART_HEIGHT - (intensity / 10) * CHART_HEIGHT; // 0-10 scale

  const linePath = keyMoments
    .sort((a,b) => a.time - b.time) // Ensure moments are sorted by time for line path
    .map((p, i) => {
      const x = xScale(p.time);
      const y = yScale(p.intensityScore);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const getValenceColor = (valence: number): string => {
    if (valence > 0) return 'stroke-green-400 fill-green-400'; // Positive
    if (valence < 0) return 'stroke-red-400 fill-red-400';     // Negative
    return 'stroke-slate-400 fill-slate-400';                 // Neutral
  };
  
  const getValenceFillColorClass = (valence: number): string => {
    if (valence > 0) return 'fill-green-500'; 
    if (valence < 0) return 'fill-red-500';   
    return 'fill-slate-500';                
  };


  return (
    <div className={`mt-10 p-6 bg-slate-800/80 rounded-xl shadow-2xl border border-slate-700 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 mb-6">
        AI Morphokinetics: Movie Motion Analysis
      </h2>

      <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
        <h3 className="text-lg font-semibold text-teal-300 mb-2">Overall Dynamic Flow Summary:</h3>
        <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed gb-content-area">{overallSummary}</p>
      </div>

      <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
        <h3 className="text-lg font-semibold text-teal-300 mb-2">Timeline Structure Notes:</h3>
        <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed gb-content-area">{timelineStructureNotes}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-teal-300 mb-3">Intensity & Emotional Arc Visualization:</h3>
        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 relative">
          <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} aria-labelledby="morphokinetics-chart-title" role="img">
            <title id="morphokinetics-chart-title">Movie Intensity and Emotional Arc</title>

            {/* Y-Axis Grid Lines & Labels */}
            {[0, 2, 4, 6, 8, 10].map(val => (
              <g key={`y-grid-${val}`}>
                <line 
                  x1={MARGIN.left} y1={yScale(val)} 
                  x2={MARGIN.left + CHART_WIDTH} y2={yScale(val)} 
                  stroke={val === 0 || val === 10 ? "#64748b" : "#475569"} // slate-500 or slate-600
                  strokeWidth="0.5"
                  strokeDasharray={val !== 0 && val !== 10 ? "2,2" : ""}
                />
                <text x={MARGIN.left - 8} y={yScale(val)} dy=".3em" textAnchor="end" fill="#94a3b8" fontSize="10px">
                  {val}
                </text>
              </g>
            ))}
             <text x={MARGIN.left - 25} y={MARGIN.top + CHART_HEIGHT / 2} dy=".3em" textAnchor="middle" fill="#94a3b8" fontSize="10px" transform={`rotate(-90 ${MARGIN.left - 25} ${MARGIN.top + CHART_HEIGHT / 2})`}>Intensity (0-10)</text>

            {/* X-Axis Grid Lines & Labels (e.g., every 0.25) */}
            {[0, 0.25, 0.5, 0.75, 1].map(val => (
              <g key={`x-grid-${val}`}>
                <line 
                  x1={xScale(val)} y1={MARGIN.top} 
                  x2={xScale(val)} y2={MARGIN.top + CHART_HEIGHT} 
                  stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2" 
                />
                <text x={xScale(val)} y={MARGIN.top + CHART_HEIGHT + 15} textAnchor="middle" fill="#94a3b8" fontSize="10px">
                  {val === 0 ? "Start" : val === 1 ? "End" : val.toFixed(2)}
                </text>
              </g>
            ))}
             <text x={MARGIN.left + CHART_WIDTH / 2} y={MARGIN.top + CHART_HEIGHT + 35} textAnchor="middle" fill="#94a3b8" fontSize="10px">Normalized Movie Time</text>


            {/* Intensity Line Path */}
            <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2.5" /> {/* Cyan-500 */}

            {/* Key Moment Points */}
            {keyMoments.sort((a,b) => a.time - b.time).map((p, i) => {
              const cx = xScale(p.time);
              const cy = yScale(p.intensityScore);
              const valenceColorClass = getValenceFillColorClass(p.emotionalValence);
              let radius = p.isTwist ? 6 : 4;
              let strokeColor = p.isTwist ? "stroke-yellow-400" : "stroke-slate-300";

              return (
                <g key={`moment-${p.time}-${i}`} 
                  onMouseEnter={() => {setHoveredMoment(p); setHoveredPosition({x: cx, y: cy});}}
                  onMouseLeave={() => {setHoveredMoment(null); setHoveredPosition(null);}}
                >
                  <circle cx={cx} cy={cy} r={radius} className={`${valenceColorClass} ${strokeColor}`} strokeWidth="1.5" />
                  {p.isTwist && (
                    <SparklesIcon className="text-yellow-400 pointer-events-none" x={cx - 6} y={cy - 6} width={12} height={12} />
                  )}
                   {p.isPacingShift && !p.isTwist && ( // Avoid overlap with twist icon
                    <ArrowTrendingUpIcon className="text-sky-400 pointer-events-none" x={cx - 5} y={cy - 12} width={10} height={10} />
                  )}
                </g>
              );
            })}
             {hoveredMoment && hoveredPosition && <Tooltip moment={hoveredMoment} x={hoveredPosition.x} y={hoveredPosition.y} />}
          </svg>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-teal-300 mb-3">Key Moments & Observations:</h3>
        <div className="space-y-3">
          {keyMoments.sort((a,b) => a.time - b.time).map((moment, index) => (
            <div key={index} className="p-3 bg-slate-700/40 rounded-lg border border-slate-600/50">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-semibold text-cyan-300">
                  Moment at ~{(moment.time * 100).toFixed(0)}%
                </span>
                <div className="flex items-center space-x-2">
                    {moment.isTwist && <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full flex items-center"><SparklesIcon className="w-3 h-3 mr-1" />Twist</span>}
                    {moment.isPacingShift && <span className="text-xs px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full flex items-center"><ArrowTrendingUpIcon className="w-3 h-3 mr-1" />Pacing Shift</span>}
                </div>
              </div>
              <p className="text-slate-300 text-xs mb-1 gb-content-area">
                <strong className="text-slate-200">Event:</strong> {moment.eventDescription}
              </p>
              <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                <span>Intensity: <strong className="text-slate-200">{moment.intensityScore}/10</strong></span>
                <span>Emotion: <strong className="text-slate-200">{moment.dominantEmotion}</strong></span>
                <span>Valence: <strong className={getValenceColor(moment.emotionalValence).replace('stroke-','text-').replace('fill-','text-')}>{moment.emotionalValence > 0 ? 'Positive' : moment.emotionalValence < 0 ? 'Negative' : 'Neutral'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

       <div className="mt-8 p-3 bg-sky-900/40 border border-sky-700/60 rounded-md text-sky-200 text-xs space-y-1">
          <div className="flex items-start">
            <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-sky-400" />
            <p><strong>Note:</strong> This Morphokinetics analysis is AI-generated and represents an interpretation of narrative dynamics. Timings are approximate. Use as a tool for deeper understanding and discussion.</p>
          </div>
      </div>

    </div>
  );
};
