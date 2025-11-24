
import React, { useState, useEffect, useCallback } from 'react';
import { ReviewStage, MovieAnalysisInput } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { LightBulbIcon } from './icons/LightBulbIcon';


interface MovieInputFormProps {
  movieInput: MovieAnalysisInput;
  setMovieInput: (input: MovieAnalysisInput) => void;
  reviewStages: { value: ReviewStage; label: string }[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onGetSuggestions?: (title: string) => Promise<string[]>;
}

export const MovieInputForm: React.FC<MovieInputFormProps> = ({
  movieInput,
  setMovieInput,
  reviewStages,
  onAnalyze,
  isAnalyzing,
  onGetSuggestions,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [originalInput, setOriginalInput] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showBudgetEstimates, setShowBudgetEstimates] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);

  // Debounced suggestion fetching
  const debouncedGetSuggestions = useCallback(
    async (title: string) => {
      if (!onGetSuggestions || title.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const suggestionResults = await onGetSuggestions(title.trim());
        if (suggestionResults && suggestionResults.length > 0) {
          // Only show suggestions if they're different from the input
          const filteredSuggestions = suggestionResults.filter(
            s => s.toLowerCase() !== title.trim().toLowerCase()
          );
          if (filteredSuggestions.length > 0) {
            setSuggestions(filteredSuggestions);
            setOriginalInput(title.trim());
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
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

  // Debounce effect
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Reset selected index when input changes
    setSelectedSuggestionIndex(-1);

    const timer = setTimeout(() => {
      if (movieInput.movieTitle.trim()) {
        debouncedGetSuggestions(movieInput.movieTitle);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoadingSuggestions(false);
      }
    }, 800); // 800ms delay

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [movieInput.movieTitle, debouncedGetSuggestions]);

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
        handleDismissSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleSuggestionSelect = (suggestion: string) => {
    // Clear any pending timer and loading state immediately
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
    setIsLoadingSuggestions(false);
    setSelectedSuggestionIndex(-1);

    setMovieInput({
      ...movieInput,
      movieTitle: suggestion,
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleDismissSuggestions = () => {
    // Clear any pending timer and loading state
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
    setIsLoadingSuggestions(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Keyboard navigation for suggestions
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
        handleDismissSuggestions();
        break;
      case 'Tab':
        // Allow tab to move to next field, but hide suggestions
        handleDismissSuggestions();
        break;
    }
  };

  return (
    <div className="p-6 bg-slate-800/70 rounded-xl shadow-2xl mb-8 border border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"> {/* Changed to items-start for better alignment with multiline helper text */}
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
                    <span className="flex-1">{suggestion}</span>
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
                  onClick={handleDismissSuggestions}
                  className="w-full text-xs text-slate-400 hover:text-slate-300 py-1"
                >
                  Dismiss suggestions (Esc)
                </button>
              </div>
            </div>
          )}
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="productionBudget" className="text-sm font-medium text-indigo-300">
              Est. Production Budget (USD)
            </label>
            <div className="flex items-center space-x-2">
              {/* Green budget estimates icon */}
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
              {/* ROI toggle button */}
              <button
                type="button"
                onClick={handleROIToggle}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                  movieInput.enableROIAnalysis
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                <span>💰</span>
                <span>ROI</span>
              </button>
            </div>
          </div>
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


          {/* Collapsible Budget Estimates - moved to label area */}
          {showBudgetEstimates && (
            <div className="mt-2 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
              <div className="space-y-2 text-xs text-green-300">
                <div className="flex justify-between">
                  <span>Independent Film:</span>
                  <span className="font-mono">$100K - $2M</span>
                </div>
                <div className="flex justify-between">
                  <span>Studio Film:</span>
                  <span className="font-mono">$20M - $200M</span>
                </div>
                <div className="flex justify-between">
                  <span>Blockbuster:</span>
                  <span className="font-mono">$100M - $400M+</span>
                </div>
                <div className="pt-2 border-t border-green-700/30 text-green-400">
                  <p>💡 These ranges help calibrate ROI analysis accuracy</p>
                </div>
              </div>
            </div>
          )}
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
