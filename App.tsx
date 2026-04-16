


import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EnhancedMovieInputForm } from './components/EnhancedMovieInputForm';
import { LayerAnalysisCard } from './components/LayerAnalysisCard';
import { ReportDisplay } from './components/ReportDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { ReviewStage, LayerAnalysisData, ReviewLayer, PersonnelData, SummaryReportData, MagicFactorAnalysis, CreativeSparkResult, TokenUsageEntry, TokenBudgetConfig, ActualPerformanceData, ScriptIdeaInput, MagicQuotientAnalysis, MovieAnalysisInput, MorphokineticsAnalysis, MonthlyScoreboardItem, FinancialAnalysisData } from './types';
import { initialLayerAnalyses, LAYER_DEFINITIONS, REVIEW_STAGES_OPTIONS, MAX_SCORE, COMMON_GENRES, INITIAL_TOKEN_BUDGET_CONFIG, CHARS_PER_TOKEN_ESTIMATE, MAX_TOKEN_LOG_ENTRIES, MOCK_MONTHLY_SCOREBOARD_DATA } from './constants';
import { analyzeLayerWithGemini, generateFinalReportWithGemini, ParsedLayerAnalysis, analyzeStakeholderMagicFactor, generateCreativeSpark, enhanceCreativeSpark, LogTokenUsageFn, analyzeIdeaMagicQuotient, analyzeMovieMorphokinetics, fetchMovieFinancialsWithGemini, generateQualitativeROIAnalysisWithGemini } from './services/geminiService';
import { AdminService } from './services/adminService';
import { PersonnelDisplay } from './components/PersonnelDisplay';
import { CreativeSparkGenerator } from './components/CreativeSparkGenerator';
import { TokenBudgetDashboard } from './components/TokenBudgetDashboard';
import { ScriptMagicQuotientAnalyzer } from './components/ScriptMagicQuotientAnalyzer';
import { InformationCircleIcon } from './components/icons/InformationCircleIcon';
import { MotionIcon } from './components/icons/MotionIcon';
import { MorphokineticsDisplay } from './components/MorphokineticsDisplay';
import { LightBulbIcon } from './components/icons/LightBulbIcon';
import { GreybrainerInsights } from './components/GreybrainerInsights';
import { GreybrainerComparison } from './components/GreybrainerComparison';
// Admin components moved to AdminSettings modal

import { GoogleSearchKeyManager } from './components/GoogleSearchKeyManager';
import { AdminSettings } from './components/AdminSettings';
import { buildGeminiQuotaMessage, isGeminiQuotaError } from './utils/geminiQuotaMessaging';

import { AuthWrapper } from './components/AuthWrapper';

const buildLocalFallbackSummaryReport = (
  movieTitle: string,
  layerAnalyses: LayerAnalysisData[],
  personnelData: PersonnelData,
  financialAnalysisData: FinancialAnalysisData | null,
): SummaryReportData => {
  const scoredLayers = layerAnalyses.filter((layer) => typeof layer.userScore === 'number');
  const overallScore = scoredLayers.length > 0
    ? scoredLayers.reduce((sum, layer) => sum + (layer.userScore as number), 0) / scoredLayers.length
    : null;

  const strongestLayer = [...scoredLayers].sort((left, right) => (right.userScore as number) - (left.userScore as number))[0];
  const weakestLayer = [...scoredLayers].sort((left, right) => (left.userScore as number) - (right.userScore as number))[0];

  const keyTakeaways = layerAnalyses
    .filter((layer) => layer.editedText)
    .map((layer) => {
      const firstParagraph = layer.editedText.split('\n').map((line) => line.trim()).find(Boolean) || 'Analysis available in the layer card.';
      return `- ${layer.title}: ${firstParagraph}`;
    })
    .join('\n');

  const improvementSuggestions = layerAnalyses
    .flatMap((layer) => Array.isArray(layer.improvementSuggestions)
      ? layer.improvementSuggestions
      : layer.improvementSuggestions
        ? [layer.improvementSuggestions]
        : [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  const personnelSummary = [
    personnelData.director ? `Director: ${personnelData.director}` : null,
    personnelData.mainCast?.length ? `Main cast: ${personnelData.mainCast.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const financialSummary = financialAnalysisData?.qualitativeROIAnalysis
    ? `\n\nFinancial perspective:\n${financialAnalysisData.qualitativeROIAnalysis}`
    : '';

  const reportText = [
    `Greybrainer generated this fallback summary for ${movieTitle} because the Gemini final-report quota is temporarily exhausted. The layer analyses below are still available and scored, so this summary synthesizes them locally to keep the report workflow moving.`,
    overallScore !== null ? `Current overall Greybrainer score: ${overallScore.toFixed(1)}/${MAX_SCORE}.` : 'Layer scores are available in the ring visualization below.',
    strongestLayer ? `Strongest current signal: ${strongestLayer.title}.` : null,
    weakestLayer && weakestLayer !== strongestLayer ? `Most fragile layer right now: ${weakestLayer.title}.` : null,
    personnelSummary || null,
    keyTakeaways ? `\nKey takeaways:\n${keyTakeaways}` : null,
    financialSummary || null,
  ].filter(Boolean).join('\n\n');

  return {
    reportText,
    overallImprovementSuggestions: improvementSuggestions.length > 0 ? improvementSuggestions : undefined,
    financialAnalysis: financialAnalysisData || undefined,
    isFallbackResult: true,
  };
};

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
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsInitialTab] = useState<'keys' | 'help' | 'admin' | 'omnichannel' | 'health' | 'diagnostics' | 'scoreboard'>('keys');

  const lastBudgetFetchTitleRef = useRef<string>('');
  const budgetFetchDebounceRef = useRef<number | null>(null);

  const [morphokineticsAnalysis, setMorphokineticsAnalysis] = useState<MorphokineticsAnalysis | null>(null);
  const [isAnalyzingMorphokinetics, setIsAnalyzingMorphokinetics] = useState<boolean>(false);
  const [morphokineticsError, setMorphokineticsError] = useState<string | null>(null);

  const [monthlyScoreboardData, setMonthlyScoreboardData] = useState<MonthlyScoreboardItem[]>([]);



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

    // User data now comes from AuthWrapper
  }, []);

  const logTokenUsage: LogTokenUsageFn = useCallback((operation, inputChars, outputChars) => {
    if (!tokenBudgetConfig.isEnabled) return;
    const newEntry: TokenUsageEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(), operation, estimatedInputChars: inputChars, estimatedOutputChars: outputChars,
      estimatedTokens: Math.ceil((inputChars + outputChars) / CHARS_PER_TOKEN_ESTIMATE),
    };
    setTokenUsageLog(prevLog => {
      const updatedLog = [newEntry, ...prevLog].slice(0, MAX_TOKEN_LOG_ENTRIES);
      localStorage.setItem('tokenUsageLog', JSON.stringify(updatedLog));
      return updatedLog;
    });
  }, [tokenBudgetConfig.isEnabled]);

  const fetchBudgetEstimate = useCallback(async (titleOverride?: string) => {
    if (!movieInput.enableROIAnalysis) return;
    if (movieInput.productionBudget !== undefined) return;

    const titleToFetch = (titleOverride ?? movieInput.movieTitle).trim();
    if (!titleToFetch) return;

    if (lastBudgetFetchTitleRef.current === titleToFetch && (financialAnalysisData?.fetchedBudget || financialAnalysisData?.isLoadingBudget)) {
      return;
    }

    lastBudgetFetchTitleRef.current = titleToFetch;
    setFinancialAnalysisData(prev => ({ ...(prev || {}), isLoadingBudget: true, errorBudget: null }));
    try {
      const financials = await fetchMovieFinancialsWithGemini(titleToFetch, logTokenUsage);
      setFinancialAnalysisData(prev => ({
        ...(prev || {}),
        fetchedBudget: financials.budget,
        fetchedBudgetCurrency: financials.currency,
        fetchedBudgetSources: financials.sources,
        fetchedDuration: financials.duration,
        isLoadingBudget: false,
        isFallbackBudgetResult: financials.isFallbackResult,
        errorBudget: null,
      }));
    } catch (error) {
      setFinancialAnalysisData(prev => ({
        ...(prev || {}),
        isLoadingBudget: false,
        errorBudget: error instanceof Error ? error.message : 'Failed to fetch budget info.',
      }));
    }
  }, [movieInput.enableROIAnalysis, movieInput.productionBudget, movieInput.movieTitle, financialAnalysisData?.fetchedBudget, financialAnalysisData?.isLoadingBudget, logTokenUsage]);

  const applyBudgetEstimate = useCallback((budgetUsd: number) => {
    const rounded = Math.round(budgetUsd);
    setMovieInput(prev => ({ ...prev, productionBudget: rounded, enableROIAnalysis: true }));
    setFinancialAnalysisData(prev => ({ ...(prev || {}), userProvidedBudget: rounded }));
  }, []);

  useEffect(() => {
    if (!movieInput.enableROIAnalysis) return;
    if (movieInput.productionBudget !== undefined) return;

    const title = movieInput.movieTitle.trim();
    if (!title) return;

    const stableIdentifier = !!movieInput.year || /\(\d{4}\)/.test(title);
    if (!stableIdentifier) return;

    if (budgetFetchDebounceRef.current) {
      window.clearTimeout(budgetFetchDebounceRef.current);
    }
    budgetFetchDebounceRef.current = window.setTimeout(() => {
      fetchBudgetEstimate(title);
    }, 900);

    return () => {
      if (budgetFetchDebounceRef.current) {
        window.clearTimeout(budgetFetchDebounceRef.current);
        budgetFetchDebounceRef.current = null;
      }
    };
  }, [movieInput.enableROIAnalysis, movieInput.productionBudget, movieInput.movieTitle, movieInput.year, fetchBudgetEstimate]);

  const saveTokenBudgetConfig = useCallback((config: TokenBudgetConfig) => {
    setTokenBudgetConfig(config);
    localStorage.setItem('tokenBudgetConfig', JSON.stringify(config));
  }, []);

  const resetAllAnalysesState = () => {
    setOverallError(null); setLayerAnalyses(initialLayerAnalyses()); setSummaryReport(null);
    setPersonnelData({ sources: [] }); setMagicFactorAnalyses([]); setAnalyzingMagicFactorFor(null);
    setCreativeSparkError(null); setActualPerformance(null); setFinancialAnalysisData(null);
    setMorphokineticsAnalysis(null); setMorphokineticsError(null);
  };

  const analyzeMovieFlowInternal = useCallback(async (confirmedMovieTitle: string) => {
    setIsAnalyzingLayers(true);
    setFinancialAnalysisData(prev => ({ ...(prev || {}), userProvidedBudget: movieInput.productionBudget }));
    setMovieInput(prev => ({ ...prev, movieTitle: confirmedMovieTitle }));
    let collectedPersonnelData: PersonnelData = { sources: [] };

    const analysesPromises = LAYER_DEFINITIONS.map(async (layerDef) => {
      setLayerAnalyses(prev => prev.map(l => l.id === layerDef.id ? { ...l, isLoading: true, error: null, aiGeneratedText: '', editedText: '', userScore: undefined, aiSuggestedScore: undefined, groundingSources: [], improvementSuggestions: undefined, vonnegutShape: undefined } : l));
      try {
        const result: ParsedLayerAnalysis = await analyzeLayerWithGemini(
          confirmedMovieTitle,
          movieInput.reviewStage,
          layerDef.id,
          layerDef.title,
          layerDef.description,
          logTokenUsage,
          movieInput.year,
          movieInput.director
        );
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
    resetAllAnalysesState();
    await analyzeMovieFlowInternal(movieInput.movieTitle.trim());
  }, [movieInput.movieTitle, analyzeMovieFlowInternal]);

  const handleEditLayerText = (layerId: ReviewLayer, newText: string) => setLayerAnalyses(prev => prev.map(l => l.id === layerId ? { ...l, editedText: newText } : l));
  const handleLayerScoreChange = (layerId: ReviewLayer, score?: number) => setLayerAnalyses(prev => prev.map(l => l.id === layerId ? { ...l, userScore: score } : l));

  const handleGenerateReport = useCallback(async () => {
    setOverallError(null); setIsGeneratingReport(true);
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
          currentFinancialData = { ...currentFinancialData, isLoadingBudget: false, errorBudget: error instanceof Error ? error.message : 'Failed to fetch budget info for report.' };
          setFinancialAnalysisData(currentFinancialData);
        }
      } else if (budgetForROI === undefined && currentFinancialData.fetchedBudget !== undefined) { budgetForROI = currentFinancialData.fetchedBudget; }

      if (budgetForROI !== undefined && !currentFinancialData.qualitativeROIAnalysis && !currentFinancialData.isLoadingROI && !currentFinancialData.errorROI) {
        currentFinancialData = { ...currentFinancialData, isLoadingROI: true, errorROI: null };
        setFinancialAnalysisData(currentFinancialData);
        try {
          const roiResult = await generateQualitativeROIAnalysisWithGemini(movieInput.movieTitle, budgetForROI!, currentFinancialData.fetchedDuration, currentFinancialData.isFallbackBudgetResult || false, layerAnalyses, logTokenUsage);
          currentFinancialData = { ...currentFinancialData, qualitativeROIAnalysis: roiResult.analysisText, isLoadingROI: false, isFallbackROIResult: roiResult.isFallbackResult };
          setFinancialAnalysisData(currentFinancialData);
        } catch (error) {
          console.error('Error generating qualitative ROI analysis:', error);
          currentFinancialData = { ...currentFinancialData, isLoadingROI: false, errorROI: error instanceof Error ? error.message : 'Failed to generate ROI analysis.' };
          setFinancialAnalysisData(currentFinancialData);
        }
      }
    }
    // Generate morphokinetics analysis if not already available (for complete report)
    let morphoAnalysis = morphokineticsAnalysis;
    if (!morphoAnalysis && !morphokineticsError) {
      try {
        morphoAnalysis = await analyzeMovieMorphokinetics(movieInput.movieTitle, logTokenUsage);
        setMorphokineticsAnalysis(morphoAnalysis);
      } catch (error) {
        console.error('Error generating morphokinetics for complete report:', error);
        // Continue without morphokinetics if it fails - don't block report generation
      }
    }

    try {
      const reportData = await generateFinalReportWithGemini(
        movieInput.movieTitle,
        movieInput.reviewStage,
        layerAnalyses,
        personnelData,
        currentFinancialData,
        logTokenUsage,
        movieInput.year,
        movieInput.director
      );
      setSummaryReport(reportData);
      setOverallError(null);
    } catch (error) {
      console.error('Error generating final report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating report.';

      if (isGeminiQuotaError(errorMessage)) {
        setSummaryReport(buildLocalFallbackSummaryReport(
          movieInput.movieTitle,
          layerAnalyses,
          personnelData,
          currentFinancialData,
        ));
        setOverallError(`${errorMessage} Greybrainer created a local fallback report from the completed layer analyses in the meantime.`);
      } else {
        setOverallError(errorMessage);
      }
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
      setCreativeSparkResults(results.map(r => ({ ...r, isFallbackResult: r.isFallbackResult || false })));
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
      const result = await analyzeMovieMorphokinetics(movieInput.movieTitle, logTokenUsage);
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
  const isCurrentlyProcessing = isAnalyzingLayers || isGeneratingReport || isAnalyzingMagicQuotient || isAnalyzingMorphokinetics || isGeneratingCreativeSpark || isEnhancingSpark || (analyzingMagicFactorFor !== null) || !!financialAnalysisData?.isLoadingBudget || !!financialAnalysisData?.isLoadingROI;

  return (
    <AuthWrapper>
      {(authUser) => (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.16),_transparent_28%),linear-gradient(135deg,_#160f25_0%,_#111827_45%,_#0b1220_100%)] text-slate-100">
          <Header
            onToggleTokenDashboard={() => setShowTokenDashboard(prev => !prev)}
          />
          <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
            <>
              {showTokenDashboard && (
                <TokenBudgetDashboard config={tokenBudgetConfig} setConfig={saveTokenBudgetConfig} usageLog={tokenUsageLog} clearLog={() => { setTokenUsageLog([]); localStorage.removeItem('tokenUsageLog'); }} onClose={() => setShowTokenDashboard(false)} />
              )}


              <div className="mb-6 rounded-2xl border border-fuchsia-500/20 bg-slate-900/55 backdrop-blur-sm p-5 shadow-lg shadow-fuchsia-950/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                      Experimental UI Shell
                    </div>
                    <h2 className="text-2xl font-semibold text-white">Post-login sandbox workspace</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      This branch is reserved for hybrid Gemini → Groq → Gemini drafting tests, Cloudflare Pages lab publishing, and UI experiments that should not resemble the stable Netlify experience.
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3 lg:min-w-[360px]">
                    <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-300">Branch</div>
                      <div className="mt-1 font-medium text-slate-100">`experiment/gemini-groq-sandbox`</div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-300">Deploy</div>
                      <div className="mt-1 font-medium text-slate-100">Cloudflare lab</div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-300">Identity</div>
                      <div className="mt-1 font-medium text-slate-100">Groq sandbox</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowSettings(true)}
                  type="button"
                  className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm rounded-lg transition-colors flex items-center gap-2 border border-fuchsia-500/20"
                  title="Settings & Configuration"
                >
                  ⚙️ Settings
                </button>
              </div>

              <EnhancedMovieInputForm
                movieInput={movieInput}
                setMovieInput={setMovieInput}
                reviewStages={REVIEW_STAGES_OPTIONS}
                onAnalyze={handleAnalyzeMovie}
                isAnalyzing={isAnalyzingLayers}
                financialAnalysisData={financialAnalysisData}
                onFetchBudgetEstimate={() => fetchBudgetEstimate()}
                onApplyBudgetEstimate={applyBudgetEstimate}
              />

              {overallError && (<div className={`my-4 p-3 bg-red-500/20 text-red-300 border-red-500 rounded-md`}>{overallError}</div>)}
              {((isAnalyzingLayers && !analysisAttempted) || financialAnalysisData?.isLoadingBudget) && (<div className="flex justify-center items-center my-10"><LoadingSpinner /><span className="ml-3 text-xl">{financialAnalysisData?.isLoadingBudget ? "Fetching financial estimates..." : "Initializing analysis..."}</span></div>)}

              <div className="mt-8 space-y-6"> {layerAnalyses.map((layer) => (<LayerAnalysisCard key={layer.id} layerData={layer} onEdit={handleEditLayerText} onScoreChange={handleLayerScoreChange} isOverallAnalyzing={isAnalyzingLayers} maxScore={MAX_SCORE} />))} </div>

              {showPersonnelAnalysis && (
                <PersonnelDisplay personnelData={personnelData} magicFactorAnalyses={magicFactorAnalyses} onAnalyzeMagicFactor={handleAnalyzeMagicFactor} analyzingMagicFactorFor={analyzingMagicFactorFor} />
              )}

              {canGenerateReport && !isCurrentlyProcessing && (
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button onClick={handleGenerateReport} disabled={isGeneratingReport || isCurrentlyProcessing} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" title={`Generate Greybrainer Report${movieInput.enableROIAnalysis ? ' with ROI Analysis' : ''}`}>
                    {isGeneratingReport || financialAnalysisData?.isLoadingROI ? (<> <LoadingSpinner size="sm" /> {financialAnalysisData?.isLoadingROI ? 'Analyzing ROI...' : 'Generating Complete Report...'}</>) : (<> <SparklesIcon className="w-5 h-5 mr-2" /> Generate Complete Report{movieInput.enableROIAnalysis ? ' + ROI' : ''}</>)}
                  </button>


                </div>
              )}

              {morphokineticsError && (<div className={`mt-4 p-3 bg-red-500/20 text-red-300 border-red-500 rounded-md`}><strong>Morphokinetics Error:</strong> {morphokineticsError}</div>)}
              {isGeneratingReport && (
                <div className="mt-8 p-8 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-lg text-slate-300">Generating complete report...</p>
                  <p className="text-sm text-slate-400">Including summary, morphokinetics, and all visualizations</p>
                </div>
              )}

              {summaryReport && !isGeneratingReport && (
                <ReportDisplay
                  summaryReportData={summaryReport}
                  title={movieInput.movieTitle}
                  reviewStage={movieInput.reviewStage}
                  currentUserEmail={authUser?.email}
                  layerAnalyses={layerAnalyses}
                  personnelData={personnelData}
                  maxScore={MAX_SCORE}
                  initialActualPerformance={actualPerformance}
                  onActualPerformanceChange={handleUpdateActualPerformance}
                  financialAnalysisData={financialAnalysisData}
                  morphokineticsAnalysis={morphokineticsAnalysis}
                />
              )}

              {morphokineticsAnalysis && !isAnalyzingMorphokinetics && (<MorphokineticsDisplay analysis={morphokineticsAnalysis} />)}

              <GreybrainerInsights
                logTokenUsage={logTokenUsage}
              />
              <GreybrainerComparison logTokenUsage={logTokenUsage} />
              {/* Monthly Scoreboard temporarily disabled due to network issues */}
              {/* <MonthlyMagicScoreboard 
            scoreboardData={monthlyScoreboardData} 
            currentUser={authUser}
            isAdmin={AdminService.isAdminSync(authUser)} // Firebase-based admin check
            logTokenUsage={logTokenUsage}
            onScoreboardGenerated={() => {
              // Refresh scoreboard data when new one is generated
              // For now, this could trigger a page refresh or data reload
              console.log('New scoreboard generated - consider refreshing data');
            }}
          /> */}

              {/* Admin Dashboard moved to Settings modal */}
              <CreativeSparkGenerator genres={COMMON_GENRES} onGenerate={handleGenerateCreativeSpark} isLoading={isGeneratingCreativeSpark || isCurrentlyProcessing} error={creativeSparkError} results={creativeSparkResults} selectedIdea={selectedSparkForUI} onSelectIdea={handleSelectSparkIdea} onEnhanceIdea={handleEnhanceSparkIdea} isEnhancing={isEnhancingSpark || isCurrentlyProcessing} />

              <ScriptMagicQuotientAnalyzer genres={COMMON_GENRES} onAnalyze={handleAnalyzeScriptMagicQuotient} isLoading={isAnalyzingMagicQuotient || isCurrentlyProcessing} error={magicQuotientError} analysisResult={magicQuotientResult} />
            </>
          </main>
          <Footer />

          {/* Admin Settings Modal */}
          <AdminSettings
            isOpen={showSettings}
            initialTab={settingsInitialTab}
            onClose={() => setShowSettings(false)}
            currentUser={authUser}
          />
        </div>
      )}
    </AuthWrapper>
  );
};

export default App;
