
import React from 'react';
import { LayerAnalysisData, ReviewLayer } from '../types';
import { MAX_SCORE, LAYER_SHORT_NAMES } from '../constants'; // Import LAYER_SHORT_NAMES

interface ConcentricRingsVisualizationProps {
  layerAnalyses: LayerAnalysisData[];
}

const RING_COLORS: Record<ReviewLayer, { stroke: string; background: string; text: string; fill: string; }> = {
  [ReviewLayer.STORY]: { stroke: 'stroke-pink-500', background: 'stroke-pink-500/30', text: 'text-pink-300', fill: 'fill-pink-300' },
  [ReviewLayer.CONCEPTUALIZATION]: { stroke: 'stroke-purple-500', background: 'stroke-purple-500/30', text: 'text-purple-300', fill: 'fill-purple-300' },
  [ReviewLayer.PERFORMANCE]: { stroke: 'stroke-sky-400', background: 'stroke-sky-400/30', text: 'text-sky-300', fill: 'fill-sky-300'},
};

export const ConcentricRingsVisualization: React.FC<ConcentricRingsVisualizationProps> = ({ layerAnalyses }) => {
  const svgSize = 320;
  const center = svgSize / 2;
  const ringThickness = 28;
  const gapBetweenRings = 12;
  const maxOuterRadius = svgSize / 2 - 15;

  // Ensure consistent order for visualization based on ReviewLayer enum values
  const storyLayer = layerAnalyses.find(l => l.id === ReviewLayer.STORY);
  const conceptualizationLayer = layerAnalyses.find(l => l.id === ReviewLayer.CONCEPTUALIZATION);
  const performanceLayer = layerAnalyses.find(l => l.id === ReviewLayer.PERFORMANCE);
  
  const orderedLayers = [storyLayer, conceptualizationLayer, performanceLayer].filter(Boolean) as LayerAnalysisData[];


  if (orderedLayers.length !== 3) {
    // Check if at least one layer is present to avoid errors if data is partially loaded
    const availableLayersForRadii = layerAnalyses.filter(l => [ReviewLayer.STORY, ReviewLayer.CONCEPTUALIZATION, ReviewLayer.PERFORMANCE].includes(l.id));
    if (availableLayersForRadii.length === 0) {
      return <div className="text-center text-slate-400 py-10">Layer data incomplete for visualization.</div>;
    }
     // Fallback if not all 3 are present but some are, to avoid breaking if initial state is partial
     // This part of the logic might need adjustment based on how partial data should be handled
  }
  
  // Radii assignment based on the standard order, even if a layer might be missing from `orderedLayers` temporarily
  // This assumes we always want Story innermost, Concept middle, Perf outermost when they *are* present.
  const radiiMapping: Record<ReviewLayer, number> = {
    [ReviewLayer.STORY]: maxOuterRadius - 2 * (ringThickness + gapBetweenRings) - ringThickness / 2, // Innermost
    [ReviewLayer.CONCEPTUALIZATION]: maxOuterRadius - ringThickness - gapBetweenRings - ringThickness / 2, // Middle
    [ReviewLayer.PERFORMANCE]: maxOuterRadius - ringThickness / 2, // Outermost
  };


  return (
    <div className="flex justify-center items-center p-4 my-6" aria-label="Concentric rings visualization of movie review layers and scores">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="transform -rotate-90"> {/* Rotate to start arc from top */}
        {orderedLayers.map((layer) => {
          const radius = radiiMapping[layer.id];
          const ringIndex = layer.id === ReviewLayer.STORY ? 0 : layer.id === ReviewLayer.CONCEPTUALIZATION ? 1 : 2;

          const IconComponent = layer.icon;
          const colors = RING_COLORS[layer.id];
          const score = layer.userScore === undefined ? 0 : layer.userScore;
          const normalizedScore = Math.max(0, Math.min(score, MAX_SCORE)) / MAX_SCORE;
          
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference * (1 - normalizedScore);

          const iconSize = ringIndex === 0 ? 18 : 20; 
          
          const displayTitle = layer.shortTitle || LAYER_SHORT_NAMES[layer.id] || layer.id;

          return (
            <g key={layer.id} aria-label={`${layer.title} layer, score ${score}/${MAX_SCORE}`}>
              {/* Background track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                className={colors.background}
                strokeWidth={ringThickness}
                fill="none"
              />
              {/* Score arc */}
              {score > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  className={colors.stroke}
                  strokeWidth={ringThickness}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              )}
              
              <g transform={`rotate(90 ${center} ${center})`}>
                {IconComponent && (
                   <svg 
                    x={center - (iconSize / 2)}
                    y={center - radius - (iconSize / 2) - (ringThickness / 2) + (ringIndex === 0 ? 3 : 5) } 
                    width={iconSize}
                    height={iconSize}
                    className={`${colors.fill.replace('fill-','text-')} ${colors.text.split(' ')[0]}`}
                  >
                    <IconComponent className={`w-full h-full`} />
                  </svg>
                )}
                <text 
                  x={center}
                  y={center - radius + (ringIndex === 0 ? 2 : 3)} 
                  className={`${colors.text} font-bold text-sm`}
                  dominantBaseline="middle"
                  textAnchor="middle"
                >
                  {layer.userScore !== undefined ? `${layer.userScore.toFixed(1)}` : `-`}
                </text>
                 <text 
                    x={center}
                    y={center + radius + ringThickness / 1.5 + (ringIndex === 0 ? - (ringThickness + 20) : 0) } 
                    className={`${colors.text} font-semibold text-[9px] uppercase tracking-wider`}
                    dominantBaseline={ringIndex === 0 ? "auto" : "hanging"}
                    textAnchor="middle"
                >
                    {displayTitle}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};