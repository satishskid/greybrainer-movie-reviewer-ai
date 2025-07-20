


import React from 'react';
import { PersonnelData, MagicFactorAnalysis } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { SparklesIcon } from './icons/SparklesIcon'; 
import { LinkIcon } from './icons/LinkIcon'; 

interface PersonnelDisplayProps {
  personnelData: PersonnelData;
  magicFactorAnalyses: MagicFactorAnalysis[];
  onAnalyzeMagicFactor: (name: string, type: 'Director' | 'Actor') => void;
  analyzingMagicFactorFor: { name: string; type: 'Director' | 'Actor' } | null;
}

const StakeholderMagicFactor: React.FC<{
  name: string;
  type: 'Director' | 'Actor';
  analysis?: MagicFactorAnalysis;
  onAnalyze: () => void;
  isAnalyzingThis: boolean;
}> = ({ name, type, analysis, onAnalyze, isAnalyzingThis }) => {

  const handleAnalyzeClick = () => {
    onAnalyze();
  };

  return (
    <div className="mt-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-semibold text-indigo-300">{name} <span className="text-xs text-slate-400">({type})</span></h4>
        {(!analysis?.analysisText && !analysis?.error && !isAnalyzingThis) && (
           <button
            onClick={handleAnalyzeClick}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow transition-colors duration-150 flex items-center bg-teal-600 hover:bg-teal-500 text-white`}
            title={`Analyze ${name}'s signature style`}
            disabled={isAnalyzingThis}
          >
            <SparklesIcon className="w-3 h-3 mr-1.5" />
            Analyze Magic Factor
          </button>
        )}
      </div>

      {isAnalyzingThis && ( 
        <div className="flex items-center justify-center my-4">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-slate-300 text-sm">Analyzing {name}'s magic factor...</span>
        </div>
      )}

      {analysis && !isAnalyzingThis && (
        <div className="mt-2">
          {analysis.error && (
            <div className="my-2 p-2 bg-red-700/30 text-red-300 border border-red-600 rounded-md text-sm gb-content-area">
              <strong>Error:</strong> {analysis.error}
            </div>
          )}
          {analysis.analysisText && (
            <>
                <h5 className="text-sm font-semibold text-teal-300 mt-2 mb-1">Signature Style Analysis:</h5>
                <p className="text-slate-200 whitespace-pre-wrap text-xs leading-relaxed bg-slate-800/40 p-2 rounded-md gb-content-area">
                    {analysis.analysisText}
                </p>
            </>
          )}
          {analysis.groundingSources && analysis.groundingSources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-600/30">
              <h6 className="text-xs text-teal-400 mb-1">Possibly informed by:</h6>
              <ul className="space-y-0.5 gb-content-area">
                {analysis.groundingSources.map((source, idx) => (
                  <li key={idx} className="text-xs flex items-center">
                    <LinkIcon className="w-3 h-3 mr-1.5 text-sky-400 flex-shrink-0" />
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline truncate" title={source.uri}>
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PersonnelDisplay: React.FC<PersonnelDisplayProps> = ({
  personnelData,
  magicFactorAnalyses,
  onAnalyzeMagicFactor,
  analyzingMagicFactorFor,
}) => {
  if (!personnelData.director && (!personnelData.mainCast || personnelData.mainCast.length === 0)) {
    return null; 
  }

  return (
    <div className="my-8 p-6 bg-slate-800/70 rounded-xl shadow-xl border border-slate-700">
      <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-sky-400 mb-4 pb-2 border-b border-slate-600">
        Personnel & Stakeholder Insights
      </h3>
      
      {personnelData.director && (
        <div className="mb-4">
          <StakeholderMagicFactor
            name={personnelData.director}
            type="Director"
            analysis={magicFactorAnalyses.find(mf => mf.stakeholderName === personnelData.director)}
            onAnalyze={() => onAnalyzeMagicFactor(personnelData.director!, 'Director')}
            isAnalyzingThis={analyzingMagicFactorFor?.name === personnelData.director}
          />
        </div>
      )}

      {personnelData.mainCast && personnelData.mainCast.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-indigo-300 mb-1">Main Cast:</h4>
          <div className="space-y-3">
            {personnelData.mainCast.map((actorName) => (
              <StakeholderMagicFactor
                key={actorName}
                name={actorName}
                type="Actor"
                analysis={magicFactorAnalyses.find(mf => mf.stakeholderName === actorName)}
                onAnalyze={() => onAnalyzeMagicFactor(actorName, 'Actor')}
                isAnalyzingThis={analyzingMagicFactorFor?.name === actorName}
              />
            ))}
          </div>
        </div>
      )}
      
      {personnelData.sources && personnelData.sources.length > 0 && (
         <div className="mt-6 pt-3 border-t border-slate-600">
            <h4 className="text-sm text-slate-400 mb-1">General Personnel Info Sources:</h4>
            <ul className="list-disc list-inside space-y-1 gb-content-area">
            {personnelData.sources.map((source, idx) => (
                <li key={idx} className="text-xs">
                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline truncate" title={source.uri}>
                    {source.title || source.uri}
                </a>
                </li>
            ))}
            </ul>
        </div>
      )}
    </div>
  );
};