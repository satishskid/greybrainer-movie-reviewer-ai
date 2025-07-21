


import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MovieInputForm } from './components/MovieInputForm';
import { LayerAnalysisCard } from './components/LayerAnalysisCard';
import { ReportDisplay } from './components/ReportDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ReviewStage, LayerAnalysisData, ReviewLayer, PersonnelData, SummaryReportData, MagicFactorAnalysis, CreativeSparkResult, TokenUsageEntry, TokenBudgetConfig, ActualPerformanceData, ScriptIdeaInput, MagicQuotientAnalysis, MovieAnalysisInput, MorphokineticsAnalysis, MonthlyScoreboardItem, FinancialAnalysisData } from './types';
import { initialLayerAnalyses, LAYER_DEFINITIONS, REVIEW_STAGES_OPTIONS, MAX_SCORE, COMMON_GENRES, INITIAL_TOKEN_BUDGET_CONFIG, CHARS_PER_TOKEN_ESTIMATE, MAX_TOKEN_LOG_ENTRIES, MOCK_MONTHLY_SCOREBOARD_DATA } from './constants';
import { analyzeLayerWithGemini, generateFinalReportWithGemini, ParsedLayerAnalysis, analyzeStakeholderMagicFactor, generateCreativeSpark, enhanceCreativeSpark, LogTokenUsageFn, analyzeIdeaMagicQuotient, analyzeMovieMorphokinetics, getMovieTitleSuggestions, fetchMovieFinancialsWithGemini, generateQualitativeROIAnalysisWithGemini } from './services/geminiService';
import { PersonnelDisplay } from './components/PersonnelDisplay';
import { CreativeSparkGenerator } from './components/CreativeSparkGenerator';
import { TokenBudgetDashboard } from './components/TokenBudgetDashboard'; 
import { ScriptMagicQuotientAnalyzer } from './components/ScriptMagicQuotientAnalyzer';
import { InformationCircleIcon } from './components/icons/InformationCircleIcon';
import { MotionIcon } from './components/icons/MotionIcon';
import { MorphokineticsDisplay } from './components/MorphokineticsDisplay';
import { MonthlyMagicScoreboard } from './components/MonthlyMagicScoreboard';
import { LightBulbIcon } from './components/icons/LightBulbIcon';
import { GreybrainerInsights } from './components/GreybrainerInsights';
import { ApiStatusChecker } from './components/ApiStatusChecker';
import { AuthWrapper } from './components/AuthWrapper';


const App: React.FC = () => {
  const [movieInput, setMovieInput] = useState<MovieAnalysisInput>({
    movieTitle: '',
    reviewStage: ReviewStage.MOVIE_RELEASED,
    productionBudget: undefined,
    enableROIAnalysis: false,
  });

  const [layerAnalyses, setLayerAnalyses] = useState<LayerAnalysisData[]>(initialLayerAnalyses());
  const [summaryReport, setSummaryReport] = useState<SummaryReportData | null>(null);
  
  const [personnelData, setPersonnelData] = useState<PersonnelData>({ sources: [] });
  const [actualPerformance, setActualPerformance] = useState<ActualPerformanceData | null>(null);
  const [financialAnalysisData, setFinancialAnalysisData] = useState<FinancialAnalysisData | null>(null);
  
  const [isAnalyzingLayers, setIsAnalyzingLayers] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  const [magicFactorAnalyses, setMagicFactorAnalyses] = useState<MagicFactorAnalysis[]>([]);
  const [analyzingMagicFactorFor, setAnalyzingMagicFactorFor] = useState<{ name: string; type: 'Director' | 'Actor' } | null>(null);

  const [creativeSparkResults, setCreativeSparkResults] = useState<CreativeSparkResult[] | null>(null);
  const [selectedSparkForUI, setSelectedSparkForUI] = useState<CreativeSparkResult | null>(null);
  const [isGeneratingCreativeSpark, setIsGeneratingCreativeSpark] = useState<boolean>(false);
  const [isEnhancingSpark, setIsEnhancingSpark] = useState<boolean>(false);
  const [creativeSparkError, setCreativeSparkError] = useState<string | null>(null);

  const [scriptIdeaInput, setScriptIdeaInput] = useState<ScriptIdeaInput | null>(null);
  const [magicQuotientResult, setMagicQuotientResult] = useState<MagicQuotientAnalysis | null>(null);
  const [isAnalyzingMagicQuotient, setIsAnalyzingMagicQuotient] = useState<boolean>(false);
  const [magicQuotientError, setMagicQuotientError] = useState<string | null>(null);

  const [tokenUsageLog, setTokenUsageLog] = useState<TokenUsageEntry[]>([]);
  const [tokenBudgetConfig, setTokenBudgetConfig] = useState<TokenBudgetConfig>(INITIAL_TOKEN_BUDGET_CONFIG);
  const [showTokenDashboard, setShowTokenDashboard] = useState<boolean>(false);

  const [morphokineticsAnalysis, setMorphokineticsAnalysis] = useState<MorphokineticsAnalysis | null>(null);
  const [isAnalyzingMorphokinetics, setIsAnalyzingMorphokinetics] = useState<boolean>(false);
  const [morphokineticsError, setMorphokineticsError] = useState<string | null>(null);

  const [monthlyScoreboardData, setMonthlyScoreboardData] = useState<MonthlyScoreboardItem[]>([]);

  const [movieTitleSuggestions, setMovieTitleSuggestions] = useState<string[] | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);
  const [originalUserMovieTitle, setOriginalUserMovieTitle] = useState<string | null>(null);
  const [showSuggestionsSection, setShowSuggestionsSection] = useState<boolean>(false);

  useEffect(() => {
    const storedTokenConfig = localStorage.getItem('tokenBudgetConfig');
    if (storedTokenConfig) {
      try { setTokenBudgetConfig(JSON.parse(storedTokenConfig)); } 
      catch (e) { console.error("Failed to parse tokenBudgetConfig", e); localStorage.removeItem('tokenBudgetConfig'); }
    }
    const storedTokenLog = localStorage.getItem('tokenUsageLog');
    if (storedTokenLog) {
       try { setTokenUsageLog(JSON.parse(storedTokenLog)); } 
       catch (e) { console.error("Failed to parse tokenUsageLog", e); localStorage.removeItem('tokenUsageLog'); }
    }
    
    const sortedScoreboardData = MOCK_MONTHLY_SCOREBOARD_DATA
      .sort((a, b) => b.greybrainerScore - a.greybrainerScore)
      .map((item, index) => ({ ...item, ranking: index + 1 }));
    setMonthlyScoreboardData(sortedScoreboardData);
  }, []);

  const saveTokenBudgetConfig = useCallback((config: TokenBudgetConfig) => {
    setTokenBudgetConfig(config);
    localStorage.setItem('tokenBudgetConfig', JSON.stringify(config));
  }, []);

  const logTokenUsage: LogTokenUsageFn = useCallback((operation, inputChars, outputChars) => {
    if (!tokenBudgetConfig.isEnabled) return;
    const newEntry: TokenUsageEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2,7), 
      timestamp: Date.now(), operation, estimatedInputChars: inputChars, estimatedOutputChars: outputChars,
      estimatedTokens: Math.ceil((inputChars + outputChars) / CHARS_PER_TOKEN_ESTIMATE),
    };
    setTokenUsageLog(prevLog => {
      const updatedLog = [newEntry, ...prevLog].slice(0, MAX_TOKEN_LOG_ENTRIES);
      localStorage.setItem('tokenUsageLog', JSON.stringify(updatedLog));
      return updatedLog;
    });
  }, [tokenBudgetConfig.isEnabled]);

  const resetAllAnalysesState = () => {
    setOverallError(null); setLayerAnalyses(initialLayerAnalyses()); setSummaryReport(null);
    setPersonnelData({ sources: [] }); setMagicFactorAnalyses([]); setAnalyzingMagicFactorFor(null);
    setCreativeSparkError(null); setActualPerformance(null); setFinancialAnalysisData(null); 
    setMorphokineticsAnalysis(null); setMorphokineticsError(null); setMovieTitleSuggestions(null);
    setShowSuggestionsSection(false); setOriginalUserMovieTitle(null);
  };
  
  const analyzeMovieFlowInternal = useCallback(async (confirmedMovieTitle: string) => {
    setIsAnalyzingLayers(true);
    setFinancialAnalysisData(prev => ({...(prev || {}), userProvidedBudget: movieInput.productionBudget}));
    setMovieInput(prev => ({ ...prev, movieTitle: confirmedMovieTitle }));
    let collectedPersonnelData: PersonnelData = { sources: [] };

    const analysesPromises = LAYER_DEFINITIONS.map(async (layerDef) => {
      setLayerAnalyses(prev => prev.map(l => l.id === layerDef.id ? { ...l, isLoading: true, error: null, aiGeneratedText: '', editedText: '', userScore: undefined, aiSuggestedScore: undefined, groundingSources: [], improvementSuggestions: undefined, vonnegutShape: undefined } : l));
      try {
        const result: ParsedLayerAnalysis = await analyzeLayerWithGemini(confirmedMovieTitle, movieInput.reviewStage, layerDef.id, layerDef.title, layerDef.description, logTokenUsage);
        setLayerAnalyses(prev => prev.map(l => l.id === layerDef.id ? { 
          ...l, aiGeneratedText: result.analysisText, editedText: result.analysisText, isLoading: false,
          aiSuggestedScore: result.aiSuggestedScore, userScore: result.aiSuggestedScore !== undefined ? result.aiSuggestedScore : undefined, 
          groundingSources: result.groundingSources || [], improvementSuggestions: result.improvementSuggestions,
          vonnegutShape: result.vonnegutShape, isFallbackResult: result.isFallbackResult
        } : l));
        if (result.director) collectedPersonnelData.director = result.director;
        if (result.mainCast && result.mainCast.length > 0) collectedPersonnelData.mainCast = result.mainCast;
        if (result.groundingSources) {
          result.groundingSources.forEach(source => {
            if (!collectedPersonnelData.sources) collectedPersonnelData.sources = [];
            if (!collectedPersonnelData.sources.find(s => s.uri === source.uri)) collectedPersonnelData.sources.push(source);
          });
        }
      } catch (error) {
        console.error(`Error analyzing ${layerDef.title}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error analyzing layer.';
        setLayerAnalyses(prev => prev.map(l => l.id === layerDef.id ? { ...l, isLoading: false, error: errorMessage } : l));
      }
    });
    await Promise.all(analysesPromises);
    setPersonnelData(collectedPersonnelData); setIsAnalyzingLayers(false);

    // Only fetch financial data if ROI analysis is enabled
    if (movieInput.enableROIAnalysis && !movieInput.productionBudget) {
      setFinancialAnalysisData(prev => ({ ...(prev || {}), isLoadingBudget: true, errorBudget: null }));
      try {
        const financials = await fetchMovieFinancialsWithGemini(confirmedMovieTitle, logTokenUsage);
        setFinancialAnalysisData(prev => ({
          ...(prev || {}), fetchedBudget: financials.budget, fetchedBudgetCurrency: financials.currency,
          fetchedBudgetSources: financials.sources, fetchedDuration: financials.duration, isLoadingBudget: false,
          isFallbackBudgetResult: financials.isFallbackResult,
        }));
      } catch (error) {
        console.error('Error fetching movie financials:', error);
        setFinancialAnalysisData(prev => ({ ...(prev || {}), isLoadingBudget: false, errorBudget: error instanceof Error ? error.message : 'Failed to fetch budget info.' }));
      }
    }
  }, [movieInput.reviewStage, movieInput.productionBudget, movieInput.enableROIAnalysis, logTokenUsage]);

  const handleAnalyzeMovie = useCallback(async () => {
    if (!movieInput.movieTitle.trim()) { setOverallError('Please enter a movie/series title.'); return; }
    resetAllAnalysesState(); setIsFetchingSuggestions(true); setOriginalUserMovieTitle(movieInput.movieTitle.trim());
    try {
      const suggestions = await getMovieTitleSuggestions(movieInput.movieTitle.trim(), logTokenUsage);
      if (suggestions && suggestions.length > 0 && suggestions.some(s => s.toLowerCase() !== movieInput.movieTitle.trim().toLowerCase())) {
        setMovieTitleSuggestions(suggestions); setShowSuggestionsSection(true);
      } else { await analyzeMovieFlowInternal(movieInput.movieTitle.trim()); }
    } catch (error) {
      console.error('Error fetching movie title suggestions or in main flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setOverallError(`Suggestion fetch failed: ${errorMessage}. Proceeding with original title.`);
      await analyzeMovieFlowInternal(movieInput.movieTitle.trim());
    } finally { setIsFetchingSuggestions(false); }
  }, [movieInput.movieTitle, logTokenUsage, analyzeMovieFlowInternal]);
  
  const handleSuggestionSelected = (suggestedTitle: string) => {
    setShowSuggestionsSection(false); setMovieTitleSuggestions(null);
    setMovieInput(prev => ({ ...prev, movieTitle: suggestedTitle }));
    analyzeMovieFlowInternal(suggestedTitle);
  };
  const handleProceedWithOriginalTitle = () => {
    setShowSuggestionsSection(false); setMovieTitleSuggestions(null);
    if (originalUserMovieTitle) analyzeMovieFlowInternal(originalUserMovieTitle);
  };
  const handleCancelSuggestions = () => {
    setShowSuggestionsSection(false); setMovieTitleSuggestions(null); setOriginalUserMovieTitle(null);
  };

  const handleEditLayerText = (layerId: ReviewLayer, newText: string) => setLayerAnalyses(prev => prev.map(l => l.id === layerId ? { ...l, editedText: newText } : l));
  const handleLayerScoreChange = (layerId: ReviewLayer, score?: number) => setLayerAnalyses(prev => prev.map(l => l.id === layerId ? { ...l, userScore: score } : l));

  const handleGenerateReport = useCallback(async () => {
    setOverallError(null); setIsGeneratingReport(true); setSummaryReport(null);
    let currentFinancialData = { ...financialAnalysisData, userProvidedBudget: movieInput.productionBudget };
    let budgetForROI = movieInput.productionBudget;

    // Only perform financial analysis if ROI is enabled
    if (movieInput.enableROIAnalysis) {
      if (budgetForROI === undefined && currentFinancialData.fetchedBudget === undefined && !currentFinancialData.isLoadingBudget && !currentFinancialData.errorBudget) {
        currentFinancialData = { ...currentFinancialData, isLoadingBudget: true, errorBudget: null };
        setFinancialAnalysisData(currentFinancialData);
        try {
          const financials = await fetchMovieFinancialsWithGemini(movieInput.movieTitle, logTokenUsage);
          currentFinancialData = { ...currentFinancialData, fetchedBudget: financials.budget, fetchedBudgetCurrency: financials.currency, fetchedBudgetSources: financials.sources, fetchedDuration: financials.duration, isLoadingBudget: false, isFallbackBudgetResult: financials.isFallbackResult };
          setFinancialAnalysisData(currentFinancialData); budgetForROI = financials.budget;
        } catch (error) {
          console.error('Error fetching movie financials during report generation:', error);
          currentFinancialData = { ...currentFinancialData, isLoadingBudget: false, errorBudget: error instanceof Error ? error.message : 'Failed to fetch budget info for report.'};
          setFinancialAnalysisData(currentFinancialData);
        }
      } else if (budgetForROI === undefined && currentFinancialData.fetchedBudget !== undefined) { budgetForROI = currentFinancialData.fetchedBudget; }

      if (budgetForROI !== undefined && !currentFinancialData.qualitativeROIAnalysis && !currentFinancialData.isLoadingROI && !currentFinancialData.errorROI) {
        currentFinancialData = { ...currentFinancialData, isLoadingROI: true, errorROI: null };
        setFinancialAnalysisData(currentFinancialData);
        try {
          const roiResult = await generateQualitativeROIAnalysisWithGemini(movieInput.movieTitle, budgetForROI, currentFinancialData.fetchedDuration, movieInput.productionBudget === undefined, layerAnalyses, logTokenUsage);
          currentFinancialData = { ...currentFinancialData, qualitativeROIAnalysis: roiResult.analysisText, isLoadingROI: false, isFallbackROIResult: roiResult.isFallbackResult };
          setFinancialAnalysisData(currentFinancialData);
        } catch (error) {
          console.error('Error generating qualitative ROI analysis:', error);
          currentFinancialData = { ...currentFinancialData, isLoadingROI: false, errorROI: error instanceof Error ? error.message : 'Failed to generate ROI analysis.'};
          setFinancialAnalysisData(currentFinancialData);
        }
      }
    }
    try {
      const reportData = await generateFinalReportWithGemini(movieInput.movieTitle, movieInput.reviewStage, layerAnalyses, personnelData, currentFinancialData, logTokenUsage);
      setSummaryReport(reportData);
    } catch (error) {
      console.error('Error generating final report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating report.';
      setOverallError(errorMessage);
    }
    setIsGeneratingReport(false);
  }, [movieInput, layerAnalyses, personnelData, financialAnalysisData, logTokenUsage]);

  const handleAnalyzeMagicFactor = useCallback(async (name: string, type: 'Director' | 'Actor') => {
    setAnalyzingMagicFactorFor({ name, type }); setMagicFactorAnalyses(prev => prev.filter(mf => mf.stakeholderName !== name));
    try {
      const result = await analyzeStakeholderMagicFactor(name, type, logTokenUsage);
      setMagicFactorAnalyses(prev => [...prev, { stakeholderName: name, stakeholderType: type, analysisText: result.analysisText, groundingSources: result.groundingSources, isLoading: false, error: null, isFallbackResult: result.isFallbackResult }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown error analyzing ${type} ${name}.`;
      setMagicFactorAnalyses(prev => [...prev, { stakeholderName: name, stakeholderType: type, analysisText: '', isLoading: false, error: errorMessage }]);
    } finally { setAnalyzingMagicFactorFor(null); }
  }, [logTokenUsage]);

  const handleGenerateCreativeSpark = useCallback(async (genre: string, inspiration?: string) => {
    setIsGeneratingCreativeSpark(true); setCreativeSparkError(null); setCreativeSparkResults(null); setSelectedSparkForUI(null);
    try {
      const results = await generateCreativeSpark(genre, inspiration, logTokenUsage);
      setCreativeSparkResults(results.map(r => ({...r, isFallbackResult: r.isFallbackResult || false })));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating creative sparks.';
      setCreativeSparkError(errorMessage);
    } finally { setIsGeneratingCreativeSpark(false); }
  }, [logTokenUsage]);

  const handleSelectSparkIdea = useCallback((ideaId: string) => {
    if (ideaId === '') { setSelectedSparkForUI(null); return; }
    const selected = creativeSparkResults?.find(idea => idea.id === ideaId) || null;
    setSelectedSparkForUI(selected);
  }, [creativeSparkResults]);

  const handleEnhanceSparkIdea = useCallback(async (enhancementPrompt: string) => {
    if (!selectedSparkForUI) { setCreativeSparkError("No base idea selected for enhancement."); return; }
    setIsEnhancingSpark(true); setCreativeSparkError(null);
    try {
      const { id, mindMapMarkdown, ...baseIdeaForEnhancement } = selectedSparkForUI;
      const enhancedResult = await enhanceCreativeSpark(baseIdeaForEnhancement, enhancementPrompt, logTokenUsage);
      setSelectedSparkForUI(enhancedResult); 
      setCreativeSparkResults(prevResults => prevResults?.map(idea => idea.id === id ? enhancedResult : idea) || [enhancedResult]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error enhancing creative spark.';
      setCreativeSparkError(errorMessage);
    } finally { setIsEnhancingSpark(false); }
  }, [selectedSparkForUI, logTokenUsage]);

  const handleAnalyzeScriptMagicQuotient = useCallback(async (idea: ScriptIdeaInput) => {
    setIsAnalyzingMagicQuotient(true); setMagicQuotientError(null); setMagicQuotientResult(null); setScriptIdeaInput(idea);
    try {
      const result = await analyzeIdeaMagicQuotient(idea, logTokenUsage);
      setMagicQuotientResult(result);
    } catch (err) { 
      const errorMessage = err instanceof Error ? err.message : 'Unknown error analyzing script idea.';
      setMagicQuotientError(errorMessage);
    } finally { setIsAnalyzingMagicQuotient(false); }
  }, [logTokenUsage]);

  const handleUpdateActualPerformance = useCallback((data: ActualPerformanceData) => {
    setActualPerformance(data);
    if (summaryReport) setSummaryReport(prev => prev ? { ...prev, actualPerformance: data } : null);
  }, [summaryReport]); 

  const handleAnalyzeMorphokinetics = useCallback(async () => {
    if (!movieInput.movieTitle) { setMorphokineticsError("Movie title is required for Morphokinetics analysis."); return; }
    setIsAnalyzingMorphokinetics(true); setMorphokineticsError(null); setMorphokineticsAnalysis(null);
    let existingAnalysesSummary = "No prior analyses available.";
    if (layerAnalyses.some(la => la.editedText)) {
      existingAnalysesSummary = layerAnalyses.filter(la => la.editedText).map(la => `${la.shortTitle}: ${la.editedText.substring(0, 100)}...`).join('\n');
    }
    try {
      const result = await analyzeMovieMorphokinetics(movieInput.movieTitle, movieInput.reviewStage, existingAnalysesSummary, logTokenUsage);
      setMorphokineticsAnalysis(result);
    } catch (error) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error analyzing movie motion.';
      setMorphokineticsError(errorMessage);
    } finally { setIsAnalyzingMorphokinetics(false); }
  }, [movieInput, layerAnalyses, logTokenUsage]); 
  
  const allLayersAnalyzedOrError = layerAnalyses.every(l => (l.aiGeneratedText !== '' || l.error !== null) && !l.isLoading);
  const analysisAttempted = layerAnalyses.some(l => l.isLoading || l.aiGeneratedText || l.error);
  const showPersonnelAnalysis = allLayersAnalyzedOrError && !isAnalyzingLayers && analysisAttempted && (personnelData.director || (personnelData.mainCast && personnelData.mainCast.length > 0));
  const canGenerateReport = allLayersAnalyzedOrError && !isAnalyzingLayers && analysisAttempted && !layerAnalyses.some(l => l.isLoading || (!l.editedText && !l.error));
  const isCurrentlyProcessing = isFetchingSuggestions || isAnalyzingLayers || isGeneratingReport || isAnalyzingMagicQuotient || isAnalyzingMorphokinetics || isGeneratingCreativeSpark || isEnhancingSpark || (analyzingMagicFactorFor !== null) || financialAnalysisData?.isLoadingBudget || financialAnalysisData?.isLoadingROI ;

  return (
    <AuthWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-100">
        <Header
          onToggleTokenDashboard={() => setShowTokenDashboard(prev => !prev)}
        />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <>
          {showTokenDashboard && (
            <TokenBudgetDashboard config={tokenBudgetConfig} setConfig={saveTokenBudgetConfig} usageLog={tokenUsageLog} clearLog={() => { setTokenUsageLog([]); localStorage.removeItem('tokenUsageLog'); }} onClose={() => setShowTokenDashboard(false)} />
          )}

          <MovieInputForm movieInput={movieInput} setMovieInput={setMovieInput} reviewStages={REVIEW_STAGES_OPTIONS} onAnalyze={handleAnalyzeMovie} isAnalyzing={isFetchingSuggestions || isAnalyzingLayers} />

          <ApiStatusChecker />

          {showSuggestionsSection && movieTitleSuggestions && originalUserMovieTitle && (
            <div className="my-4 p-4 bg-slate-700/80 rounded-lg shadow-lg border border-indigo-500/50">
              <div className="flex items-center mb-3"> <LightBulbIcon className="w-6 h-6 text-yellow-400 mr-2" /> <h3 className="text-lg font-semibold text-yellow-300">Did you mean?</h3> </div>
              <p className="text-sm text-slate-300 mb-3"> You entered: <strong className="italic">"{originalUserMovieTitle}"</strong>. We found some similar titles: </p>
              <div className="space-y-2"> {movieTitleSuggestions.map((suggestion, index) => (<button key={index} onClick={() => handleSuggestionSelected(suggestion)} className="w-full text-left px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors text-sm">{suggestion}</button>))} </div>
              <div className="mt-4 pt-3 border-t border-slate-600/70 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button onClick={handleProceedWithOriginalTitle} className="w-full sm:w-auto px-4 py-2 bg-slate-500 hover:bg-slate-400 text-white rounded-md transition-colors text-sm">No, proceed with "{originalUserMovieTitle}"</button>
                <button onClick={handleCancelSuggestions} className="w-full sm:w-auto px-4 py-2 bg-transparent hover:bg-slate-600/50 text-slate-300 border border-slate-500 rounded-md transition-colors text-sm">Clear & Edit My Input</button>
              </div>
            </div>
          )}
          {overallError && (<div className={`my-4 p-3 bg-red-500/20 text-red-300 border-red-500 rounded-md`}>{overallError}</div>)}
          {(isFetchingSuggestions || (isAnalyzingLayers && !analysisAttempted) || financialAnalysisData?.isLoadingBudget) && !showSuggestionsSection && (<div className="flex justify-center items-center my-10"><LoadingSpinner /><span className="ml-3 text-xl">{isFetchingSuggestions ? "Checking title..." : financialAnalysisData?.isLoadingBudget ? "Fetching financial estimates..." : "Initializing analysis..."}</span></div>)}
          
          <div className="mt-8 space-y-6"> {layerAnalyses.map((layer) => (<LayerAnalysisCard key={layer.id} layerData={layer} onEdit={handleEditLayerText} onScoreChange={handleLayerScoreChange} isOverallAnalyzing={isAnalyzingLayers || isFetchingSuggestions} maxScore={MAX_SCORE}/>))} </div>

          {showPersonnelAnalysis && (
              <PersonnelDisplay personnelData={personnelData} magicFactorAnalyses={magicFactorAnalyses} onAnalyzeMagicFactor={handleAnalyzeMagicFactor} analyzingMagicFactorFor={analyzingMagicFactorFor} />
          )}

          {canGenerateReport && !isCurrentlyProcessing && (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={handleGenerateReport} disabled={isGeneratingReport || isCurrentlyProcessing} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" title={`Generate Greybrainer Report${movieInput.enableROIAnalysis ? ' with ROI Analysis' : ''}`}>
                {isGeneratingReport || financialAnalysisData?.isLoadingROI ? (<> <LoadingSpinner size="sm" /> {financialAnalysisData?.isLoadingROI ? 'Analyzing ROI...':'Generating Report...'}</>) : (<> <SparklesIcon className="w-5 h-5 mr-2" /> Generate Report{movieInput.enableROIAnalysis ? ' + ROI' : ''}</>)}
              </button>
              
              <button onClick={handleAnalyzeMorphokinetics} disabled={isAnalyzingMorphokinetics || !movieInput.movieTitle || isCurrentlyProcessing} className="w-full sm:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" title="Analyze Movie Motion & Dynamics">
                {isAnalyzingMorphokinetics ? (<> <LoadingSpinner size="sm" /> Analyzing Motion...</>) : (<> <MotionIcon className="w-5 h-5 mr-2" /> Analyze Movie Motion</>)}
              </button>
            </div>
          )}
          
          {morphokineticsError && (<div className={`mt-4 p-3 bg-red-500/20 text-red-300 border-red-500 rounded-md`}><strong>Morphokinetics Error:</strong> {morphokineticsError}</div>)}
          {summaryReport && !isGeneratingReport && (<ReportDisplay summaryReportData={summaryReport} title={movieInput.movieTitle} layerAnalyses={layerAnalyses} personnelData={personnelData} maxScore={MAX_SCORE} initialActualPerformance={actualPerformance} onActualPerformanceChange={handleUpdateActualPerformance} financialAnalysisData={financialAnalysisData} />)}
          
          {morphokineticsAnalysis && !isAnalyzingMorphokinetics && (<MorphokineticsDisplay analysis={morphokineticsAnalysis} />)}
          
          <GreybrainerInsights logTokenUsage={logTokenUsage} />
          <MonthlyMagicScoreboard scoreboardData={monthlyScoreboardData} />

          <CreativeSparkGenerator genres={COMMON_GENRES} onGenerate={handleGenerateCreativeSpark} isLoading={isGeneratingCreativeSpark || isCurrentlyProcessing} error={creativeSparkError} results={creativeSparkResults} selectedIdea={selectedSparkForUI} onSelectIdea={handleSelectSparkIdea} onEnhanceIdea={handleEnhanceSparkIdea} isEnhancing={isEnhancingSpark || isCurrentlyProcessing} />
          
          <ScriptMagicQuotientAnalyzer genres={COMMON_GENRES} onAnalyze={handleAnalyzeScriptMagicQuotient} isLoading={isAnalyzingMagicQuotient || isCurrentlyProcessing} error={magicQuotientError} analysisResult={magicQuotientResult} />
        </>
        </main>
        <Footer />
      </div>
    </AuthWrapper>
  );
};

export default App;