import React, { useState }  from 'react';
import { LayerAnalysisData, ReviewLayer } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { EditIcon } from './icons/EditIcon';
import { StarIcon } from './icons/StarIcon';
import { LightBulbIcon } from './icons/LightBulbIcon'; 
import { ReadMoreLess } from './ReadMoreLess';
import { CollapsibleSection } from './CollapsibleSection'; // Added
import { VonnegutStoryShapeVisualization } from './VonnegutStoryShapeVisualization'; // Added
import { BookOpenIcon } from './icons/BookOpenIcon'; // For Story specific section icon


interface LayerAnalysisCardProps {
  layerData: LayerAnalysisData;
  onEdit: (layerId: ReviewLayer, newText: string) => void;
  onScoreChange: (layerId: ReviewLayer, score?: number) => void;
  isOverallAnalyzing: boolean;
  maxScore: number;
}

const INITIAL_VISIBLE_ANALYSIS_LINES = 12; 

export const LayerAnalysisCard: React.FC<LayerAnalysisCardProps> = ({ layerData, onEdit, onScoreChange, isOverallAnalyzing, maxScore }) => {
  const [isEditing, setIsEditing] = useState(false);
  const IconComponent = layerData.icon;

  const handleToggleEdit = () => {
    if (layerData.isLoading || isOverallAnalyzing) return;
    setIsEditing(!isEditing);
  };

  const handleScoreInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onScoreChange(layerData.id, undefined);
    } else {
      let score = parseFloat(value);
      if (isNaN(score)) score = 0;
      score = Math.max(0, Math.min(score, maxScore));
      onScoreChange(layerData.id, score);
    }
  };

  const canInteract = !layerData.isLoading && !isOverallAnalyzing && layerData.aiGeneratedText;

  const renderImprovementSuggestions = () => {
    if (!layerData.improvementSuggestions) return <p className="text-slate-400 italic text-xs">No specific enhancements suggested for this layer.</p>;

    const content = typeof layerData.improvementSuggestions === 'string' ? (
      <p className="text-sky-200 whitespace-pre-wrap text-xs leading-relaxed gb-content-area">
        {layerData.improvementSuggestions}
      </p>
    ) : Array.isArray(layerData.improvementSuggestions) ? (
      <ul className="list-disc list-inside text-sky-200 text-xs leading-relaxed space-y-1 gb-content-area">
        {layerData.improvementSuggestions.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    ) : null;

    return (
        <div className="p-3 bg-sky-800/30 border border-sky-700/50 rounded-md">
            {content}
        </div>
    );
  };


  return (
    <div className="bg-slate-800/60 p-5 rounded-lg shadow-xl border border-slate-700/50 transition-all duration-300 hover:shadow-indigo-500/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
        <div className="flex items-center mb-2 sm:mb-0">
          <IconComponent className="w-7 h-7 text-indigo-400 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-semibold text-indigo-300">{layerData.title}</h3>
            <p className="text-xs text-slate-400">{layerData.description}</p>
          </div>
        </div>
        {canInteract && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleEdit}
              className={`p-2 rounded-md transition-colors ${isEditing ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
              title={isEditing ? "Save Edits (auto-saved)" : "Edit Analysis"}
            >
              <EditIcon className="w-5 h-5 text-slate-200" />
            </button>
          </div>
        )}
      </div>

      {layerData.isLoading && (
        <div className="flex items-center justify-center h-40">
          <LoadingSpinner />
          <span className="ml-2 text-slate-300">AI is analyzing this layer...</span>
        </div>
      )}

      {layerData.error && !layerData.isLoading && (
        <div className="my-2 p-3 bg-red-700/30 text-red-300 border border-red-600 rounded-md text-sm">
          <strong>Error:</strong> {layerData.error}
        </div>
      )}

      {!layerData.isLoading && !layerData.error && layerData.aiGeneratedText && (
        <div className="mt-2 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300 mt-3 mb-1">AI Generated Analysis:</h4>
          {isEditing ? (
            <textarea
              value={layerData.editedText}
              onChange={(e) => onEdit(layerData.id, e.target.value)}
              className="w-full h-48 p-3 bg-slate-700/80 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100 resize-y gb-content-area"
              placeholder="Edit AI-generated analysis..."
            />
          ) : (
            <ReadMoreLess
              text={layerData.editedText || (isOverallAnalyzing ? "Waiting for analysis..." : "No analysis generated yet.")}
              initialVisibleLines={INITIAL_VISIBLE_ANALYSIS_LINES}
              className="text-slate-300 text-sm leading-relaxed p-3 bg-slate-700/50 rounded-md min-h-[50px] gb-content-area"
            />
          )}
          
          {/* Collapsible Improvement Suggestions Section */}
          {!isEditing && layerData.improvementSuggestions && (
             <CollapsibleSection 
                title="Potential Enhancements" 
                icon={<LightBulbIcon className="w-4 h-4 text-sky-400" />}
                titleClassName="text-sm font-semibold text-sky-300"
                className="border-t border-slate-700/50 mt-4 pt-3"
             >
                {renderImprovementSuggestions()}
            </CollapsibleSection>
          )}

          {/* Collapsible Vonnegut Story Shape Section (only for Story layer) */}
          {layerData.id === ReviewLayer.STORY && layerData.vonnegutShape && !isEditing && (
            <CollapsibleSection
              title="Story Shape Analysis (Vonnegut)"
              icon={<BookOpenIcon className="w-4 h-4 text-purple-400" />} // Example icon
              titleClassName="text-sm font-semibold text-purple-300"
              initiallyOpen={true}
              className="border-t border-slate-700/50 mt-4 pt-3"
            >
              <VonnegutStoryShapeVisualization shapeData={layerData.vonnegutShape} />
            </CollapsibleSection>
          )}
          
          {/* Score Input Section */}
          <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-md mt-4">
            <StarIcon className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <label htmlFor={`score-${layerData.id}`} className="text-sm font-medium text-amber-300">
              Your Score:
            </label>
            <input
              type="number"
              id={`score-${layerData.id}`}
              value={layerData.userScore === undefined ? '' : layerData.userScore}
              onChange={handleScoreInputChange}
              min="0"
              max={maxScore}
              step="0.5"
              className="w-24 px-2 py-1 bg-slate-600 border border-slate-500 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-100 text-sm"
              placeholder={`0-${maxScore}`}
              disabled={!canInteract}
              aria-label={`Score for ${layerData.title} (0-${maxScore})`}
            />
            <span className="text-sm text-slate-400">/ {maxScore}</span>
          </div>
        </div>
      )}
       {!layerData.isLoading && !layerData.error && !layerData.aiGeneratedText && !isOverallAnalyzing && (
         <p className="text-slate-500 italic text-sm p-3 text-center">Enter movie details and click "Analyze Movie" to generate insights.</p>
       )}
    </div>
  );
};
