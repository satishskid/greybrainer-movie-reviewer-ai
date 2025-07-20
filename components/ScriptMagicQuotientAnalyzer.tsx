
import React, { useState } from 'react';
import { ScriptIdeaInput, MagicQuotientAnalysis, SubjectiveScores } from '../types';
import { COMMON_GENRES, MAGIC_QUOTIENT_DISCLAIMER } from '../constants';
import { LoadingSpinner } from './LoadingSpinner';
import { SparklesIcon } from './icons/SparklesIcon';
import { SimpleBeakerIcon } from './icons/BeakerIcon'; // Using the simpler version
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { StarIcon } from './icons/StarIcon'; // For displaying scores

interface ScriptMagicQuotientAnalyzerProps {
  genres: string[];
  onAnalyze: (idea: ScriptIdeaInput) => void;
  isLoading: boolean;
  error: string | null;
  analysisResult: MagicQuotientAnalysis | null;
}

export const ScriptMagicQuotientAnalyzer: React.FC<ScriptMagicQuotientAnalyzerProps> = ({
  genres,
  onAnalyze,
  isLoading,
  error,
  analysisResult,
}) => {
  const [title, setTitle] = useState<string>('');
  const [logline, setLogline] = useState<string>('');
  const [synopsis, setSynopsis] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>(genres[0] || '');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logline.trim() || !synopsis.trim()) {
      setFormError('Logline and Synopsis/Details are required.');
      return;
    }
    setFormError(null);
    onAnalyze({
      title: title.trim(),
      logline: logline.trim(),
      synopsis: synopsis.trim(),
      genre: selectedGenre,
    });
  };

  const renderScoreBar = (score: number | undefined, label: string) => {
    if (score === undefined) return null;
    const percentage = Math.max(0, Math.min(score, 10)) * 10; // 0-10 scale to 0-100%
    let barColor = 'bg-red-500';
    if (score >= 7) barColor = 'bg-green-500';
    else if (score >= 4) barColor = 'bg-yellow-500';

    return (
      <div className="mb-2">
        <div className="flex justify-between items-center text-xs mb-0.5">
          <span className="text-slate-300">{label}</span>
          <span className={`font-semibold ${score >=7 ? 'text-green-300' : score >= 4 ? 'text-yellow-300' : 'text-red-300'}`}>{score}/10</span>
        </div>
        <div className="w-full bg-slate-600 rounded-full h-2.5">
          <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };


  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex items-center mb-6">
        <SimpleBeakerIcon className="w-7 h-7 text-cyan-400 mr-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">
          Script Idea - Magic Quotient Test
        </h2>
      </div>

      <div className="p-3 mb-6 bg-sky-900/40 border border-sky-700/60 rounded-md text-sky-200 text-xs space-y-1">
          <div className="flex items-start">
            <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-sky-400" />
            <p><strong>How to Use:</strong> Input your script/story idea details below. The AI will provide a subjective analysis of its potential, strengths, weaknesses, and suggestions for improvement. This is a creative brainstorming tool.</p>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="ideaTitle" className="block text-sm font-medium text-cyan-300 mb-1">
            Idea Title (Optional)
          </label>
          <input
            type="text"
            id="ideaTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., The Last Stargazer"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-100 placeholder-slate-400"
          />
        </div>
        <div>
          <label htmlFor="ideaLogline" className="block text-sm font-medium text-cyan-300 mb-1">
            Logline <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="ideaLogline"
            value={logline}
            onChange={(e) => setLogline(e.target.value)}
            placeholder="A compelling one-sentence summary of your story."
            required
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-100 placeholder-slate-400"
          />
        </div>
        <div>
          <label htmlFor="ideaSynopsis" className="block text-sm font-medium text-cyan-300 mb-1">
            Synopsis / Key Details <span className="text-red-400">*</span>
          </label>
          <textarea
            id="ideaSynopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="Expand on your idea: main plot points, character arcs, themes, unique elements (200-500 words recommended)."
            rows={5}
            required
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-100 placeholder-slate-400 resize-y gb-content-area"
          />
        </div>
        <div>
          <label htmlFor="ideaGenre" className="block text-sm font-medium text-cyan-300 mb-1">
            Select Genre
          </label>
          <select
            id="ideaGenre"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-slate-100"
          >
            {genres.map((genre) => (
              <option key={genre} value={genre} className="bg-slate-700 text-slate-100">
                {genre}
              </option>
            ))}
          </select>
        </div>

        {formError && (
          <p className="text-sm text-red-400 bg-red-900/30 p-2 rounded-md">{formError}</p>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
          >
            {isLoading ? (
              <> <LoadingSpinner size="sm" /> Analyzing Idea Potential...</>
            ) : (
              <> <SparklesIcon className="w-5 h-5 mr-2" /> Test Magic Quotient</>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="my-4 p-3 bg-red-700/30 text-red-300 border border-red-600 rounded-md text-sm gb-content-area">
          <strong>Error:</strong> {error}
        </div>
      )}

      {analysisResult && !isLoading && (
        <div className="mt-8 pt-6 border-t border-slate-700/70 space-y-6">
          <h3 className="text-xl font-semibold text-cyan-200 mb-3">Magic Quotient Analysis Results:</h3>
          
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
            <h4 className="text-md font-semibold text-cyan-300 mb-2">Overall Assessment:</h4>
            <p className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm gb-content-area">{analysisResult.overallAssessment}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
              <h4 className="text-md font-semibold text-green-400 mb-2">Identified Strengths:</h4>
              {analysisResult.strengths.length > 0 ? (
                <ul className="list-disc list-inside text-slate-200 text-sm space-y-1 gb-content-area">
                  {analysisResult.strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                </ul>
              ) : <p className="text-slate-400 italic text-sm">No specific strengths highlighted by AI.</p>}
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
              <h4 className="text-md font-semibold text-amber-400 mb-2">Areas for Development:</h4>
               {analysisResult.areasForDevelopment.length > 0 ? (
                <ul className="list-disc list-inside text-slate-200 text-sm space-y-1 gb-content-area">
                  {analysisResult.areasForDevelopment.map((item, index) => <li key={`dev-${index}`}>{item}</li>)}
                </ul>
              ) : <p className="text-slate-400 italic text-sm">No specific areas for development highlighted by AI.</p>}
            </div>
          </div>
          
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
            <h4 className="text-md font-semibold text-sky-400 mb-2">Actionable Suggestions:</h4>
            {analysisResult.actionableSuggestions.length > 0 ? (
            <ul className="list-disc list-inside text-slate-200 text-sm space-y-1 gb-content-area">
              {analysisResult.actionableSuggestions.map((item, index) => <li key={`suggest-${index}`}>{item}</li>)}
            </ul>
            ) : <p className="text-slate-400 italic text-sm">No specific suggestions provided by AI.</p>}
          </div>

          {analysisResult.subjectiveScores && (
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/70">
              <h4 className="text-md font-semibold text-purple-400 mb-3">Subjective Potential Scores (AI Estimate):</h4>
              <div className="space-y-3">
                {renderScoreBar(analysisResult.subjectiveScores.originality, "Originality")}
                {renderScoreBar(analysisResult.subjectiveScores.audienceAppeal, "Audience Appeal")}
                {renderScoreBar(analysisResult.subjectiveScores.criticalReception, "Critical Reception")}
              </div>
            </div>
          )}
          
          <div className="mt-6 p-3 bg-amber-900/40 border border-amber-700/60 rounded-md text-amber-200 text-xs gb-content-area">
            <div className="flex items-start">
                <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-amber-400" />
                <p><strong>Disclaimer:</strong> {analysisResult.generatedDisclaimer || MAGIC_QUOTIENT_DISCLAIMER}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
