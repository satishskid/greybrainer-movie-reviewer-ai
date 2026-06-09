// Simplified movie input form with basic search and IMDb ID lookup
import React, { useState, useEffect, useCallback } from 'react';
import { FinancialAnalysisData, ReviewStage, MovieAnalysisInput } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { lookupMovieByImdbId } from '../services/geminiService';

interface EnhancedMovieInputFormProps {
  movieInput: MovieAnalysisInput;
  setMovieInput: (input: MovieAnalysisInput) => void;
  reviewStages: { value: ReviewStage; label: string }[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
  financialAnalysisData?: FinancialAnalysisData | null;
  onFetchBudgetEstimate?: () => void;
  onApplyBudgetEstimate?: (budgetUsd: number) => void;
}

export const EnhancedMovieInputForm: React.FC<EnhancedMovieInputFormProps> = ({
  movieInput,
  setMovieInput,
  reviewStages,
  onAnalyze,
  isAnalyzing,
  financialAnalysisData,
  onFetchBudgetEstimate,
  onApplyBudgetEstimate,
}) => {
  const [inputMode, setInputMode] = useState<'search' | 'id'>('search');
  const [idInput, setIdInput] = useState('');
  const [idType, setIdType] = useState<'imdb' | 'tmdb'>('imdb');
  const [foundTitle, setFoundTitle] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [idError, setIdError] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showBudgetEstimates, setShowBudgetEstimates] = useState(false);

  // Simple IMDb ID lookup using Gemini API
  const lookupMovieById = useCallback(async (id: string) => {
    if (!id.trim()) {
      setIdError('Please enter a movie ID');
      return null;
    }

    setIsLookingUp(true);
    setIdError('');

    try {
      // Use Gemini API to lookup the IMDb ID
      const title = await lookupMovieByImdbId(id.trim());
      
      if (title) {
        setFoundTitle(title);
        // Auto-fill the movie title in the main input
        setMovieInput({
          ...movieInput,
          movieTitle: title,
        });
        return title;
      } else {
        setIdError('Movie not found');
        setFoundTitle('');
        return null;
      }
    } catch (error) {
      setIdError(error instanceof Error ? error.message : 'Error looking up movie ID');
      console.error('ID lookup error:', error);
      return null;
    } finally {
      setIsLookingUp(false);
    }
  }, [movieInput, setMovieInput]);

  // Handle ID input change
  const handleIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdInput(value);
    setIdError('');
  };

  // Handle ID lookup
  const handleIdLookup = async () => {
    await lookupMovieById(idInput);
  };

  // Handle ID type change
  const handleIdTypeChange = (type: 'imdb' | 'tmdb') => {
    setIdType(type);
    setIdError('');
  };

  // Clear ID lookup
  const clearIdLookup = () => {
    setIdInput('');
    setFoundTitle('');
    setIdError('');
    setIsLookingUp(false);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setMovieInput({
      ...movieInput,
      [name]: name === 'productionBudget' ? (value === '' ? undefined : parseFloat(value)) : value,
    });
  };

  useEffect(() => {
    if (!showAdvancedOptions && inputMode === 'id') {
      setInputMode('search');
    }
  }, [showAdvancedOptions, inputMode]);

  return (
    <div className="p-6 bg-slate-800/70 rounded-xl shadow-2xl mb-8 border border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {/* Input Mode Selection */}
        <div className="md:col-span-1 lg:col-span-3 mb-4">
          <label className="block text-sm font-medium text-indigo-300 mb-2">
            Input Method
          </label>
          <div className="flex items-center justify-between gap-3">
            <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setInputMode('search')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'search'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🔍 Search by Title
            </button>
            {showAdvancedOptions && (
              <button
                type="button"
                onClick={() => setInputMode('id')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'id'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🆔 Enter Movie ID
              </button>
            )}
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedOptions((v) => !v)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              {showAdvancedOptions ? 'Hide options' : 'More options'}
            </button>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-indigo-300 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-indigo-200">Manual report engine</div>
              <div className="text-xs text-slate-300 mt-1">
                Search for a title directly here or paste one manually. The report workflow stays manual and stable.
              </div>
            </div>
          </div>
        </div>

        {/* ID Input Mode */}
        {showAdvancedOptions && inputMode === 'id' && (
          <div className="md:col-span-2 lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-indigo-300 mb-1">
                  ID Type
                </label>
                <select
                  value={idType}
                  onChange={(e) => handleIdTypeChange(e.target.value as 'imdb' | 'tmdb')}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100"
                  disabled={true} /* TMDB support coming soon */
                >
                  <option value="imdb">IMDb ID</option>
                  {/* <option value="tmdb">TMDB ID</option> TMDB support coming soon */}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-indigo-300 mb-1">
                  {idType === 'imdb' ? 'IMDb ID' : 'TMDB ID'} {idType === 'imdb' ? '(e.g., tt0910970)' : '(e.g., 9345)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={idInput}
                    onChange={handleIdInputChange}
                    placeholder={idType === 'imdb' ? 'tt0910970' : '9345'}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100 placeholder-slate-400"
                  />
                  {isLookingUp && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
                {idError && (
                  <p className="mt-1 text-sm text-red-400">{idError}</p>
                )}
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleIdLookup}
                  disabled={isLookingUp || !idInput.trim()}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLookingUp ? 'Looking up...' : 'Lookup'}
                </button>
              </div>
            </div>

            {/* Found Movie Display */}
            {foundTitle && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white mb-2">{foundTitle}</h4>
                    <p className="text-sm text-slate-300">Found via {idType.toUpperCase()} ID lookup</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearIdLookup}
                    className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Input Mode */}
        {inputMode === 'search' && (
          <div className="md:col-span-1 relative">
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
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-slate-400">
              Autosuggestions are disabled on this stable release to preserve Gemini capacity for full reviews.
            </p>
          </div>
        )}

        {/* Rest of the form fields (same as original) */}
        {showAdvancedOptions && (
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
        )}
        
        {/* Budget and ROI fields (same as original) */}
        {showAdvancedOptions && (
        <div className="md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="productionBudget" className="text-sm font-medium text-indigo-300">
              Est. Production Budget (USD)
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setMovieInput({ ...movieInput, enableROIAnalysis: !movieInput.enableROIAnalysis })}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                  movieInput.enableROIAnalysis
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span>💰</span>
                <span>ROI</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBudgetEstimates(!showBudgetEstimates)}
                className="flex items-center space-x-1 text-green-400 hover:text-green-300 transition-colors"
              >
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <svg
                  className={`w-3 h-3 transition-transform ${showBudgetEstimates ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          <input
            type="number"
            id="productionBudget"
            name="productionBudget"
            value={movieInput.productionBudget || ''}
            onChange={handleInputChange}
            placeholder="50000000"
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100 placeholder-slate-400"
            aria-label="Production Budget Input"
          />
          {movieInput.enableROIAnalysis && (
            <div className="mt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex-1">
                  {financialAnalysisData?.isLoadingBudget
                    ? 'Fetching budget estimate via Gemini grounding...'
                    : financialAnalysisData?.fetchedBudget
                      ? `AI found ~${financialAnalysisData.fetchedBudget.toLocaleString()} ${financialAnalysisData.fetchedBudgetCurrency || 'USD'}`
                      : financialAnalysisData?.errorBudget
                        ? `Budget fetch failed: ${financialAnalysisData.errorBudget}`
                        : 'No AI budget estimate yet.'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onFetchBudgetEstimate}
                    disabled={!onFetchBudgetEstimate || !!financialAnalysisData?.isLoadingBudget || !movieInput.movieTitle.trim()}
                    className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fetch
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const budget = financialAnalysisData?.fetchedBudget;
                      const currency = (financialAnalysisData?.fetchedBudgetCurrency || 'USD').toUpperCase();
                      if (budget && onApplyBudgetEstimate && currency === 'USD') {
                        onApplyBudgetEstimate(budget);
                      }
                    }}
                    disabled={
                      !onApplyBudgetEstimate ||
                      !financialAnalysisData?.fetchedBudget ||
                      ((financialAnalysisData?.fetchedBudgetCurrency || 'USD').toUpperCase() !== 'USD')
                    }
                    className="px-2 py-1 text-xs rounded bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use
                  </button>
                </div>
              </div>
              {financialAnalysisData?.fetchedBudgetSources && financialAnalysisData.fetchedBudgetSources.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-slate-500 mb-1">Sources:</div>
                  <ul className="list-disc list-inside ml-3 space-y-0.5">
                    {financialAnalysisData.fetchedBudgetSources.slice(0, 3).map((s, i) => (
                      <li key={`budget-src-${i}`}>
                        <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                          {s.title || s.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {showBudgetEstimates && (
            <div className="mt-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="text-xs text-slate-300 space-y-1">
                <div>💡 Budget ranges (USD):</div>
                <div>• Indie: $1M - $10M</div>
                <div>• Mid-budget: $10M - $50M</div>
                <div>• Blockbuster: $50M - $200M+</div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Analyze Button */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing || !movieInput.movieTitle.trim()}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
        >
          {isAnalyzing ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span>Analyze Movie Magic</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
