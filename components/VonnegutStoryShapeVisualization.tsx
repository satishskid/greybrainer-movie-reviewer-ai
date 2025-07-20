import React from 'react';
import { VonnegutShapeData, PlotPoint } from '../types';

interface VonnegutStoryShapeVisualizationProps {
  shapeData: VonnegutShapeData;
  className?: string;
}

const SVG_WIDTH = 450;
const SVG_HEIGHT = 300;
const MARGIN = { top: 30, right: 30, bottom: 60, left: 50 }; // Increased bottom for descriptions
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

export const VonnegutStoryShapeVisualization: React.FC<VonnegutStoryShapeVisualizationProps> = ({ shapeData, className = '' }) => {
  if (!shapeData || !shapeData.plotPoints || shapeData.plotPoints.length === 0) {
    return (
      <div className={`p-4 text-slate-400 italic text-center ${className}`}>
        No story shape data available for visualization.
      </div>
    );
  }

  const { name, justification, plotPoints } = shapeData;

  // Scales
  const xScale = (time: number) => MARGIN.left + time * CHART_WIDTH;
  const yScale = (fortune: number) => MARGIN.top + CHART_HEIGHT / 2 - (fortune * (CHART_HEIGHT / 2)); // 0 fortune is center

  const linePath = plotPoints
    .map((p, i) => {
      const x = xScale(p.time);
      const y = yScale(p.fortune);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className={`p-3 bg-slate-700/30 border border-slate-600/50 rounded-md ${className}`}>
      <h4 className="text-md font-semibold text-purple-300 mb-1">
        Identified Story Shape: <span className="italic">{name}</span>
      </h4>
      <p className="text-xs text-slate-300 mb-3 whitespace-pre-wrap gb-content-area">{justification}</p>
      
      <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} aria-labelledby="vonnegut-chart-title" role="img" className="bg-slate-800/50 rounded">
        <title id="vonnegut-chart-title">Vonnegut Story Shape: {name}</title>
        
        {/* Y-Axis Line & Labels */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + CHART_HEIGHT} stroke="#4a5568" strokeWidth="1" />
        <text x={MARGIN.left - 10} y={MARGIN.top} dy=".3em" textAnchor="end" fill="#a0aec0" fontSize="10">Good Fortune</text>
        <text x={MARGIN.left - 10} y={MARGIN.top + CHART_HEIGHT} dy=".3em" textAnchor="end" fill="#a0aec0" fontSize="10">Ill Fortune</text>
        <text x={MARGIN.left - 10} y={MARGIN.top + CHART_HEIGHT / 2} dy=".3em" textAnchor="end" fill="#a0aec0" fontSize="10">Neutral</text>

        {/* X-Axis Line & Labels */}
        <line x1={MARGIN.left} y1={MARGIN.top + CHART_HEIGHT} x2={MARGIN.left + CHART_WIDTH} y2={MARGIN.top + CHART_HEIGHT} stroke="#4a5568" strokeWidth="1" />
        <text x={MARGIN.left} y={MARGIN.top + CHART_HEIGHT + 15} textAnchor="start" fill="#a0aec0" fontSize="10">Beginning</text>
        <text x={MARGIN.left + CHART_WIDTH} y={MARGIN.top + CHART_HEIGHT + 15} textAnchor="end" fill="#a0aec0" fontSize="10">End</text>
        
        {/* Zero Fortune Line */}
        <line 
          x1={MARGIN.left} 
          y1={yScale(0)} 
          x2={MARGIN.left + CHART_WIDTH} 
          y2={yScale(0)} 
          stroke="#6366f1" 
          strokeWidth="1" 
          strokeDasharray="3,3" 
        />

        {/* Story Path */}
        <path d={linePath} fill="none" stroke="#ec4899" strokeWidth="2.5" />

        {/* Plot Points Circles & Numbers */}
        {plotPoints.map((p, i) => (
          <g key={`point-${i}`}>
            <circle cx={xScale(p.time)} cy={yScale(p.fortune)} r="4" fill="#ec4899" stroke="#fce7f3" strokeWidth="1" />
            <text 
              x={xScale(p.time)} 
              y={yScale(p.fortune) - 8} // Position number above circle
              textAnchor="middle" 
              fill="#f0abfc" 
              fontSize="10"
              fontWeight="bold"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-4 space-y-1.5">
        <h5 className="text-sm font-semibold text-purple-200">Key Plot Points:</h5>
        {plotPoints.map((p, i) => (
          <p key={`desc-${i}`} className="text-xs text-slate-300 gb-content-area">
            <span className="font-bold text-purple-300 mr-1.5">{i + 1}.</span>
            {p.description} 
            <span className="text-slate-400 text-[10px] ml-1.5">(Time: {p.time.toFixed(1)}, Fortune: {p.fortune.toFixed(1)})</span>
          </p>
        ))}
      </div>
    </div>
  );
};
