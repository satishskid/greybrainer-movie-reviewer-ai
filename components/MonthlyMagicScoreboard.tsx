
import React, { useState, useMemo, useEffect } from 'react';
import { MonthlyScoreboardItem } from '../types';
import { TrophyIcon } from './icons/TrophyIcon';
import { StarIcon } from './icons/StarIcon';
import { MAX_SCORE } from '../constants';
import { FilterIcon } from './icons/FilterIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';
import { LanguageIcon } from './icons/LanguageIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { MonthlyScoreboardService } from '../services/monthlyScoreboardService';
import { LoadingSpinner } from './LoadingSpinner';
import { SparklesIcon } from './icons/SparklesIcon';
import { RealDateService, RealDateInfo } from '../services/realDateService'; 

const ALL_FILTER_VALUE = "All";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TARGET_INDIAN_LANGUAGES = ["Hindi", "Malayalam", "Tamil", "Telugu", "Marathi", "Bengali"];

interface MonthlyMagicScoreboardProps {
  scoreboardData: MonthlyScoreboardItem[];
  currentUser?: any; // Firebase user object
  isAdmin?: boolean; // Whether current user is admin
  logTokenUsage?: (operation: string, inputChars: number, outputChars: number) => void;
  onScoreboardGenerated?: () => void; // Callback when new scoreboard is generated
}

export const MonthlyMagicScoreboard: React.FC<MonthlyMagicScoreboardProps> = ({ 
  scoreboardData, 
  currentUser, 
  isAdmin = false, 
  logTokenUsage,
  onScoreboardGenerated 
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth(); // 0-11

  // State for real date
  const [realDate, setRealDate] = useState<RealDateInfo | null>(null);
  const [isLoadingDate, setIsLoadingDate] = useState(true);

  // Load real current date on component mount
  useEffect(() => {
    const loadRealDate = async () => {
      try {
        const currentRealDate = await RealDateService.getCurrentDate();
        setRealDate(currentRealDate);
        
        // Set smart defaults based on real date
        const smartDefaults = getSmartDefaults(currentRealDate);
        setSelectedYear(smartDefaults.year);
        setSelectedMonth(smartDefaults.month);
      } catch (error) {
        console.error('Failed to load real date:', error);
        // Fallback to system date
        const fallbackDate = new Date();
        setSelectedYear(fallbackDate.getFullYear());
        setSelectedMonth(MONTH_NAMES[fallbackDate.getMonth()]);
      } finally {
        setIsLoadingDate(false);
      }
    };

    loadRealDate();
  }, []);

  // Smart defaults based on real date
  const getSmartDefaults = (currentRealDate: RealDateInfo) => {
    // Check if current month has data
    const hasCurrentMonthData = scoreboardData.some(item => 
      item.releaseMonth.includes(currentRealDate.month) && 
      item.releaseMonth.includes(currentRealDate.year.toString())
    );
    
    if (hasCurrentMonthData) {
      return { year: currentRealDate.year, month: currentRealDate.month };
    }
    
    // Check previous month
    const prevMonth = RealDateService.getPreviousMonth(currentRealDate);
    const hasPrevMonthData = scoreboardData.some(item => 
      item.releaseMonth.includes(prevMonth.month) && 
      item.releaseMonth.includes(prevMonth.year.toString())
    );
    
    if (hasPrevMonthData) {
      return { year: prevMonth.year, month: prevMonth.month };
    }
    
    // Default to current month (admin can generate if needed)
    return { year: currentRealDate.year, month: currentRealDate.month };
  };

  const [selectedYear, setSelectedYear] = useState<number | string>(2025); // Temporary default
  const [selectedMonth, setSelectedMonth] = useState<string>('November'); // Temporary default
  
  // Admin generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>("India"); // Default to India
  const [selectedRegion, setSelectedRegion] = useState<string>(ALL_FILTER_VALUE);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(ALL_FILTER_VALUE);

  const availableYears = useMemo(() => {
    const yearsFromData = new Set(scoreboardData.map(item => {
      const yearPart = item.releaseMonth.split(' ')[1];
      return yearPart ? parseInt(yearPart) : null;
    }).filter(year => year !== null) as number[]);
    
    // Add current real year and nearby years
    const currentRealYear = realDate?.year || 2025;
    yearsFromData.add(currentRealYear);
    yearsFromData.add(currentRealYear - 1); // Previous year
    yearsFromData.add(currentRealYear + 1); // Next year (for future planning)
    return Array.from(yearsFromData).sort((a, b) => b - a); // Sort descending
  }, [scoreboardData, currentYear]);

  useEffect(() => {
    // Ensure selectedYear is valid if data changes
    if (!availableYears.includes(Number(selectedYear))) {
        setSelectedYear(currentYear);
        setSelectedMonth(MONTH_NAMES[currentMonthIndex]);
    }
  }, [availableYears, selectedYear, currentYear, currentMonthIndex]);

  const countries = useMemo(() => {
    const uniqueCountries = new Set(scoreboardData.map(item => item.country).filter(Boolean) as string[]);
    return [ALL_FILTER_VALUE, ...Array.from(uniqueCountries).sort()];
  }, [scoreboardData]);

  const regions = useMemo(() => {
    if (selectedCountry === ALL_FILTER_VALUE) {
       const uniqueRegions = new Set(scoreboardData.map(item => item.region).filter(Boolean) as string[]);
       return [ALL_FILTER_VALUE, ...Array.from(uniqueRegions).sort()];
    }
    const regionsInCountry = new Set(
      scoreboardData
        .filter(item => item.country === selectedCountry && item.region)
        .map(item => item.region!)
    );
    return [ALL_FILTER_VALUE, ...Array.from(regionsInCountry).sort()];
  }, [scoreboardData, selectedCountry]);

  const languages = useMemo(() => {
    let filteredByCountry = scoreboardData;
    if (selectedCountry !== ALL_FILTER_VALUE) {
      filteredByCountry = filteredByCountry.filter(item => item.country === selectedCountry);
    }
    let filteredByRegion = filteredByCountry;
    if (selectedRegion !== ALL_FILTER_VALUE && regions.includes(selectedRegion)) {
        filteredByRegion = filteredByRegion.filter(item => item.region === selectedRegion);
    }
    
    const languagesInScope = new Set(
      filteredByRegion
        .map(item => item.language)
        .filter(Boolean) as string[]
    );
    return [ALL_FILTER_VALUE, ...Array.from(languagesInScope).sort()];
  }, [scoreboardData, selectedCountry, selectedRegion, regions]);

  useEffect(() => {
    if (!regions.includes(selectedRegion)) {
        setSelectedRegion(ALL_FILTER_VALUE);
    }
  }, [selectedCountry, regions, selectedRegion]);

  useEffect(() => {
    if (!languages.includes(selectedLanguage)) {
        setSelectedLanguage(ALL_FILTER_VALUE);
    }
  }, [selectedCountry, selectedRegion, languages, selectedLanguage]);

  // Admin: Generate new scoreboard
  const handleGenerateScoreboard = async () => {
    if (!isAdmin || !currentUser || isGenerating) return;

    setIsGenerating(true);
    setGenerationStatus('Searching for releases...');

    try {
      const year = typeof selectedYear === 'number' ? selectedYear : parseInt(selectedYear.toString());
      
      const result = await MonthlyScoreboardService.generateMonthlyScoreboard(
        year,
        selectedMonth,
        currentUser.uid,
        logTokenUsage
      );

      setGenerationStatus(`✅ Generated ${result.totalItems} entries!`);
      
      // Notify parent component to refresh data
      if (onScoreboardGenerated) {
        onScoreboardGenerated();
      }
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setGenerationStatus('');
      }, 5000);

    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setTimeout(() => {
        setGenerationStatus('');
      }, 8000);
    } finally {
      setIsGenerating(false);
    }
  };


  const filteredAndRankedData = useMemo(() => {
    let filtered = scoreboardData;

    if (selectedYear !== ALL_FILTER_VALUE && typeof selectedYear === 'number') {
        const yearNum = Number(selectedYear);
        filtered = filtered.filter(item => {
            const releaseYear = parseInt(item.releaseMonth.split(' ')[1]);
            return releaseYear === yearNum;
        });
    }
    if (selectedMonth !== ALL_FILTER_VALUE && selectedYear !== ALL_FILTER_VALUE) { // Month filter only active if a year is chosen
        filtered = filtered.filter(item => item.releaseMonth.startsWith(selectedMonth));
    }

    if (selectedCountry !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(item => item.country === selectedCountry);
    }
    if (selectedRegion !== ALL_FILTER_VALUE && regions.includes(selectedRegion)) {
      filtered = filtered.filter(item => item.region === selectedRegion);
    }
    
    // Enhanced language filtering
    if (selectedCountry === "India" && selectedLanguage === ALL_FILTER_VALUE) {
        filtered = filtered.filter(item => item.language && TARGET_INDIAN_LANGUAGES.includes(item.language));
    } else if (selectedLanguage !== ALL_FILTER_VALUE && languages.includes(selectedLanguage)) {
        filtered = filtered.filter(item => item.language === selectedLanguage);
    }


    return filtered
      .sort((a, b) => (b.greybrainerScore ?? 0) - (a.greybrainerScore ?? 0))
      .map((item, index) => ({ ...item, ranking: index + 1 }));
  }, [scoreboardData, selectedYear, selectedMonth, selectedCountry, selectedRegion, selectedLanguage, regions, languages]);


  if (!scoreboardData || scoreboardData.length === 0) {
    return (
      <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
        <div className="flex items-center mb-4">
          <TrophyIcon className="w-7 h-7 text-amber-400 mr-3" />
          <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
            Monthly Magic Scoreboard
          </h2>
        </div>
        <p className="text-slate-400 text-center py-4">
          Data for the magic scoreboard is not yet available. Check back soon!
        </p>
      </div>
    );
  }

  const FilterDropdown: React.FC<{
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: (string | number)[];
    optionLabels?: (string | number)[]; // Optional labels if different from values
    icon?: React.ReactNode;
    disabled?: boolean;
    className?: string;
  }> = ({ label, value, onChange, options, optionLabels, icon, disabled = false, className = "flex-1 min-w-[120px]" }) => (
    <div className={className}>
      <label className="block text-xs font-medium text-indigo-300 mb-1 flex items-center">
        {icon && <span className="mr-1.5 opacity-80">{icon}</span>}
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled || options.length === 0 || (options.length === 1 && options[0] === ALL_FILTER_VALUE)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((opt, index) => <option key={opt} value={opt} className="bg-slate-700">{optionLabels ? optionLabels[index] : opt}</option>)}
      </select>
    </div>
  );

  // Show loading while fetching real date
  if (isLoadingDate) {
    return (
      <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
          <span className="ml-3 text-slate-300">Loading current date information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex flex-col md:flex-row items-center justify-between mb-4">
        <div className="flex items-center mb-3 md:mb-0">
            <TrophyIcon className="w-8 h-8 text-amber-400 mr-3" />
            <h2 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400">
                Monthly Magic Scoreboard
            </h2>
        </div>
        <div className="flex flex-col items-center md:items-end space-y-2">
          <div className="text-center md:text-right">
            <p className="text-slate-300 text-sm">
              Top-rated releases, filtered by you.
            </p>
            {realDate && (
              <p className="text-slate-400 text-xs mt-1">
                📅 Current: {realDate.month} {realDate.year} 
                {realDate.source !== 'system_fallback' && (
                  <span className="ml-1 text-green-400">✓</span>
                )}
              </p>
            )}
          </div>
          
          {/* Debug Info */}
          {currentUser && (
            <div className="text-xs text-slate-500 mb-1">
              User: {currentUser.email} | Admin: {isAdmin ? 'Yes' : 'No'}
            </div>
          )}
          
          {/* Admin Generate Button */}
          {isAdmin && (
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={handleGenerateScoreboard}
                disabled={isGenerating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Generate {selectedMonth} {selectedYear}</span>
                  </>
                )}
              </button>
              
              {generationStatus && (
                <div className={`text-xs px-2 py-1 rounded ${
                  generationStatus.includes('❌') 
                    ? 'bg-red-900/50 text-red-300' 
                    : generationStatus.includes('✅')
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-blue-900/50 text-blue-300'
                }`}>
                  {generationStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
        <div className="flex items-center mb-3">
            <FilterIcon className="w-5 h-5 text-indigo-400 mr-2" />
            <h3 className="text-md font-semibold text-indigo-300">Filter Releases</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <FilterDropdown 
            label="Year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === ALL_FILTER_VALUE ? ALL_FILTER_VALUE : parseInt(e.target.value))}
            options={[ALL_FILTER_VALUE, ...availableYears]}
            icon={<CalendarIcon className="w-4 h-4" />}
            className="flex-grow min-w-[100px]"
          />
          <FilterDropdown 
            label="Month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={[ALL_FILTER_VALUE, ...MONTH_NAMES]}
            icon={<CalendarIcon className="w-4 h-4 opacity-0" />} // Hidden icon for alignment if needed
            disabled={selectedYear === ALL_FILTER_VALUE}
            className="flex-grow min-w-[120px]"
          />
          <FilterDropdown 
            label="Country" 
            value={selectedCountry} 
            onChange={(e) => {setSelectedCountry(e.target.value); setSelectedRegion(ALL_FILTER_VALUE); setSelectedLanguage(ALL_FILTER_VALUE);}} 
            options={countries}
            icon={<GlobeAltIcon className="w-4 h-4" />}
            className="flex-grow min-w-[120px]"
          />
          <FilterDropdown 
            label="Region/State" 
            value={selectedRegion} 
            onChange={(e) => {setSelectedRegion(e.target.value); setSelectedLanguage(ALL_FILTER_VALUE);}} 
            options={regions}
            icon={<LocationMarkerIcon className="w-4 h-4" />}
            disabled={selectedCountry === ALL_FILTER_VALUE && regions.length <=1}
            className="flex-grow min-w-[120px]"
          />
          <FilterDropdown 
            label="Language" 
            value={selectedLanguage} 
            onChange={(e) => setSelectedLanguage(e.target.value)} 
            options={languages}
            icon={<LanguageIcon className="w-4 h-4" />}
            disabled={languages.length <=1 && selectedCountry !== "India"} // Language filter can be "All" for India, even if list is short
            className="flex-grow min-w-[120px]"
          />
        </div>
      </div>


      <div className="space-y-4">
        {filteredAndRankedData.length > 0 ? filteredAndRankedData.map((item) => (
          <div 
            key={item.id} 
            className={`flex flex-col md:flex-row items-center p-4 rounded-lg shadow-lg border transition-all duration-300 hover:shadow-indigo-500/20 
                        ${item.ranking === 1 ? 'bg-gradient-to-r from-amber-700/30 via-slate-700/50 to-slate-700/50 border-amber-500/70' 
                           : item.ranking === 2 ? 'bg-gradient-to-r from-slate-600/30 via-slate-700/50 to-slate-700/50 border-slate-500/50' 
                           : item.ranking === 3 ? 'bg-gradient-to-r from-indigo-800/20 via-slate-700/50 to-slate-700/50 border-indigo-600/40' 
                           : 'bg-slate-700/50 border-slate-600/50'}`}
          >
            <div className="flex-shrink-0 w-20 h-28 md:w-24 md:h-36 mb-4 md:mb-0 md:mr-5 rounded overflow-hidden shadow-md bg-slate-600 flex items-center justify-center">
              {item.posterUrl ? (
                <img src={item.posterUrl} alt={`${item.title} Poster`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 text-xs text-center p-2">No Poster</span>
              )}
            </div>

            <div className="flex-grow text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start mb-1">
                 <span className={`text-2xl font-bold mr-3 ${
                    item.ranking === 1 ? 'text-amber-400' 
                    : item.ranking === 2 ? 'text-slate-300' 
                    : item.ranking === 3 ? 'text-indigo-300' 
                    : 'text-slate-400'
                    }`}>
                    #{item.ranking}
                </span>
                <h3 className="text-lg md:text-xl font-semibold text-indigo-300">{item.title}</h3>
              </div>
              <p className="text-xs text-slate-400 mb-1">
                {item.type} on <span className="font-medium">{item.platform}</span> - Released: {item.releaseMonth}
              </p>
               <p className="text-xs text-slate-500 mb-1">
                {item.country}{item.region && `, ${item.region}`}{item.language && ` (${item.language})`}
              </p>
              {item.summary && (
                <p className="text-sm text-slate-300 mb-2 leading-relaxed max-w-md gb-content-area">
                  {item.summary}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 md:ml-4 mt-3 md:mt-0 text-center">
              <p className="text-xs text-amber-300 mb-0.5">Greybrainer Score</p>
              <div className="flex items-center justify-center">
                <StarIcon className="w-7 h-7 text-amber-400 mr-1" />
                <span className="text-3xl font-bold text-amber-400">
                  {(item.greybrainerScore ?? 0).toFixed(1)}
                </span>
                <span className="text-sm text-amber-300 ml-1">/ {MAX_SCORE}</span>
              </div>
            </div>
          </div>
        )) : (
            <p className="text-slate-400 text-center py-6 italic">
                No releases match your current filter criteria. Try adjusting the filters.
            </p>
        )}
      </div>
       <p className="text-center text-xs text-slate-500 mt-8 italic">
          Scores are generated by Greybrainer AI analysis for illustrative and entertainment purposes. Rankings are based on these scores within the selected filters.
        </p>
    </div>
  );
};
