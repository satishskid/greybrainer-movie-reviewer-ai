// Simplified movie input form with basic search and IMDb ID lookup
import React, { useState, useEffect, useCallback } from 'react';
import { ReviewStage, MovieAnalysisInput, MovieSuggestion } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { lookupMovieByImdbId } from '../services/geminiService';

interface EnhancedMovieInputFormProps {
  movieInput: MovieAnalysisInput;
  setMovieInput: (input: MovieAnalysisInput) => void;
  reviewStages: { value: ReviewStage; label: string }[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onGetSuggestions?: (title: string) => Promise<MovieSuggestion[]>;
}

export const EnhancedMovieInputForm: React.FC<EnhancedMovieInputFormProps> = ({
  movieInput,
  setMovieInput,
  reviewStages,
  onAnalyze,
  isAnalyzing,
  onGetSuggestions,
}) => {
  const [inputMode, setInputMode] = useState<'search' | 'id'>('search');
  const [idInput, setIdInput] = useState('');
  const [idType, setIdType] = useState<'imdb' | 'tmdb'>('imdb');
  const [foundTitle, setFoundTitle] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [idError, setIdError] = useState('');
  
  // Original search states
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [originalInput, setOriginalInput] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showBudgetEstimates, setShowBudgetEstimates] = useState(false);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Original search functionality (simplified)
  const debouncedGetSuggestions = useCallback(
    async (title: string) => {
      if (!onGetSuggestions || title.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const suggestionResults = await onGetSuggestions(title.trim());
        if (suggestionResults && suggestionResults.length > 0) {
          // Filter out exact matches if needed, or just show all
          // For rich objects, we probably want to show them even if title matches, to show year/director
          setSuggestions(suggestionResults);
          setOriginalInput(title.trim());
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [onGetSuggestions]
  );

  // Debounce effect for search
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    setSelectedSuggestionIndex(-1);

    const timer = window.setTimeout(() => {
      if (movieInput.movieTitle.trim() && inputMode === 'search') {
        debouncedGetSuggestions(movieInput.movieTitle);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoadingSuggestions(false);
      }
    }, 800);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [movieInput.movieTitle, debouncedGetSuggestions, inputMode]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMovieInput({
      ...movieInput,
      [name]: name === 'productionBudget' ? (value === '' ? undefined : parseFloat(value)) : value,
    });
  };

  // Handle suggestion select
  const handleSuggestionSelect = (suggestion: MovieSuggestion) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
    setIsLoadingSuggestions(false);
    setSelectedSuggestionIndex(-1);

    const titleWithYear = suggestion.year ? `${suggestion.title} (${suggestion.year})` : suggestion.title;

    setMovieInput({
      ...movieInput,
      movieTitle: titleWithYear,
      year: suggestion.year,
      director: suggestion.director,
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle key down for keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      case 'Tab':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  return (
    <div className="p-6 bg-slate-800/70 rounded-xl shadow-2xl mb-8 border border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {/* Input Mode Selection */}
        <div className="md:col-span-1 lg:col-span-3 mb-4">
          <label className="block text-sm font-medium text-indigo-300 mb-2">
            Input Method
          </label>
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
          </div>
        </div>

        {/* ID Input Mode */}
        {inputMode === 'id' && (
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
          <div className="md:col-span-1 relative" ref={inputContainerRef}>
            <label htmlFor="movieTitle" className="block text-sm font-medium text-indigo-300 mb-1">
              Movie/Series Title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="movieTitle"
                name="movieTitle"
                value={movieInput.movieTitle}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Dune: Part Two"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-slate-100 placeholder-slate-400"
                aria-label="Movie or Series Title Input"
                required
                autoComplete="off"
              />
              {isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>

            {/* Real-time Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-slate-600">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center">
                      <LightBulbIcon className="w-3 h-3 mr-1" />
                      <span>Suggestions for "{originalInput}"</span>
                    </div>
                    <span className="text-xs">↑↓ navigate • Enter select • Esc dismiss</span>
                  </div>
                </div>
                <div className="py-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between group ${
                        selectedSuggestionIndex === index
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{suggestion.title} {suggestion.year && <span className="opacity-75">({suggestion.year})</span>}</div>
                        <div className="text-xs opacity-75">{suggestion.type} • {suggestion.director}</div>
                        {suggestion.description && <div className="text-xs opacity-60 truncate">{suggestion.description}</div>}
                      </div>
                      {index === 0 && (
                        <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full opacity-75 group-hover:opacity-100 ml-2">
                          Best Match
                        </span>
                      )}
                      {selectedSuggestionIndex === index && (
                        <span className="text-xs bg-indigo-400 px-2 py-0.5 rounded-full ml-2">
                          Selected
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-600">
                  <button
                    onClick={() => {
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }}
                    className="w-full text-xs text-slate-400 hover:text-slate-300 py-1"
                  >
                    Dismiss suggestions (Esc)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rest of the form fields (same as original) */}
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
        
        {/* Budget and ROI fields (same as original) */}
        <div className="md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="productionBudget" className="text-sm font-medium text-indigo-300">
              Est. Production Budget (USD)
            </label>
            <div className="flex items-center space-x-2">
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