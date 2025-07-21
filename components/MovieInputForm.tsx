
import React from 'react';
import { ReviewStage, MovieAnalysisInput } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoadingSpinner } from './LoadingSpinner';

interface MovieInputFormProps {
  movieInput: MovieAnalysisInput;
  setMovieInput: (input: MovieAnalysisInput) => void;
  reviewStages: { value: ReviewStage; label: string }[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const MovieInputForm: React.FC<MovieInputFormProps> = ({
  movieInput,
  setMovieInput,
  reviewStages,
  onAnalyze,
  isAnalyzing,
}) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMovieInput({
      ...movieInput,
      [name]: name === 'productionBudget' ? (value === '' ? undefined : parseFloat(value)) : value,
    });
  };

  const handleROIToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMovieInput({
      ...movieInput,
      enableROIAnalysis: e.target.checked,
    });
  };

  return (
    <div className="p-6 bg-slate-800/70 rounded-xl shadow-2xl mb-8 border border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"> {/* Changed to items-start for better alignment with multiline helper text */}
        <div className="md:col-span-1">
          <label htmlFor="movieTitle" className="block text-sm font-medium text-indigo-300 mb-1">
            Movie/Series Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="movieTitle"
            name="movieTitle"
            value={movieInput.movieTitle}
            onChange={handleInputChange}
            placeholder="e.g., Dune: Part Two"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100 placeholder-slate-400"
            aria-label="Movie or Series Title Input"
            required
          />
        </div>
        <div className="md:col-span-1">
          <label htmlFor="reviewStage" className="block text-sm font-medium text-indigo-300 mb-1">
            Review Stage
          </label>
          <select
            id="reviewStage"
            name="reviewStage"
            value={movieInput.reviewStage}
            onChange={handleInputChange}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100"
            aria-label="Review Stage Selector"
          >
            {reviewStages.map(stage => (
              <option key={stage.value} value={stage.value} className="bg-slate-700 text-slate-100">
                {stage.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 lg:col-span-1"> {/* Ensure this takes full width on medium, one third on large */}
          <label htmlFor="productionBudget" className="block text-sm font-medium text-indigo-300 mb-1">
            Est. Production Budget (USD)
          </label>
          <input
            type="number"
            id="productionBudget"
            name="productionBudget"
            value={movieInput.productionBudget === undefined ? '' : movieInput.productionBudget}
            onChange={handleInputChange}
            placeholder="e.g., 100000000"
            min="0"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100 placeholder-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number spinners
            aria-label="Estimated Production Budget Input"
          />
           <p className="text-xs text-slate-400 mt-1">
             Optional. If not provided, AI may estimate. Used for ROI insights & future service tiering.
           </p>
        </div>
      </div>

      {/* ROI Analysis Opt-in */}
      <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="enableROIAnalysis"
            checked={movieInput.enableROIAnalysis || false}
            onChange={handleROIToggle}
            className="mt-1 w-4 h-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="enableROIAnalysis" className="text-sm font-medium text-slate-200 cursor-pointer">
              💰 Enable ROI & Financial Analysis
            </label>
            <p className="text-xs text-slate-400 mt-1">
              Include budget estimation, production duration analysis, and qualitative ROI insights.
              This feature uses additional AI processing and may increase analysis time.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !movieInput.movieTitle.trim()}
          className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label="Analyze Movie Button"
        >
          {isAnalyzing ? (
            <> <LoadingSpinner size="sm" /> Analyzing...</>
          ) : (
            <> <SparklesIcon className="w-5 h-5 mr-2" /> Analyze Movie </>
          )}
        </button>
      </div>
       <div className="mt-4 text-center">
        <p className="text-xs text-slate-500 italic">
            By using Greybrainer AI, you agree to our Terms of Service. Analysis provided is for informational and creative guidance only and does not guarantee project success.
        </p>
      </div>
    </div>
  );
};
