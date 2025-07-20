
import React, { useState } from 'react';
import { CreativeSparkResult, CharacterIdea, SceneIdea } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { SparklesIcon } from './icons/SparklesIcon';
import { FilmIcon } from './icons/FilmIcon';
import { StoryMindMap } from './StoryMindMap'; // Import the new component

interface CreativeSparkGeneratorProps {
  genres: string[];
  onGenerate: (genre: string, inspiration?: string) => void;
  isLoading: boolean;
  error: string | null;
  results: CreativeSparkResult[] | null; // Array of results
  selectedIdea: CreativeSparkResult | null;
  onSelectIdea: (ideaId: string) => void;
  onEnhanceIdea: (enhancementPrompt: string) => void;
  isEnhancing: boolean;
}

export const CreativeSparkGenerator: React.FC<CreativeSparkGeneratorProps> = ({
  genres,
  onGenerate,
  isLoading,
  error,
  results,
  selectedIdea,
  onSelectIdea,
  onEnhanceIdea,
  isEnhancing,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>(genres[0] || '');
  const [inspirationText, setInspirationText] = useState<string>('');
  const [enhancementPrompt, setEnhancementPrompt] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGenre) return;
    onGenerate(selectedGenre, inspirationText.trim());
  };

  const handleEnhanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enhancementPrompt.trim() || !selectedIdea) return;
    onEnhanceIdea(enhancementPrompt.trim());
  };

  return (
    <div className="mt-12 p-6 bg-slate-800/70 rounded-xl shadow-2xl border border-slate-700">
      <div className="flex items-center mb-6">
        <FilmIcon className="w-7 h-7 text-purple-400 mr-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Creative Spark: Generate & Refine Story Ideas
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="genreSelect" className="block text-sm font-medium text-purple-300 mb-1">
            Select Genre
          </label>
          <select
            id="genreSelect"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors text-slate-100"
            aria-label="Genre Selector for Creative Spark"
          >
            {genres.map((genre) => (
              <option key={genre} value={genre} className="bg-slate-700 text-slate-100">
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="inspirationText" className="block text-sm font-medium text-purple-300 mb-1">
            Optional: Initial Inspiration, Keywords, or Themes
          </label>
          <textarea
            id="inspirationText"
            value={inspirationText}
            onChange={(e) => setInspirationText(e.target.value)}
            placeholder="e.g., A lonely robot on Mars, a hidden magical world, a detective with a secret..."
            rows={2}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors text-slate-100 placeholder-slate-400 resize-y"
            aria-label="Inspiration text for Creative Spark"
          />
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading || !selectedGenre || isEnhancing}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
          >
            {isLoading ? (
              <> <LoadingSpinner size="sm" /> Generating Ideas...</>
            ) : (
              <> <SparklesIcon className="w-5 h-5 mr-2" /> Generate Story Ideas (3-4 options)</>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="my-4 p-3 bg-red-700/30 text-red-300 border border-red-600 rounded-md text-sm gb-content-area">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Display multiple generated ideas */}
      {results && !isLoading && !selectedIdea && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-purple-300">Generated Ideas:</h3>
          {results.map((idea) => (
            <div key={idea.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-purple-500 transition-colors">
              <p className="text-sm font-semibold text-purple-200 mb-1">Logline: <span className="italic font-normal text-slate-300">{idea.logline}</span></p>
              <button
                onClick={() => onSelectIdea(idea.id)}
                className="mt-2 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow"
              >
                View & Enhance this Idea
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Display selected idea for viewing and enhancement */}
      {selectedIdea && (
        <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-xl font-semibold text-purple-200 mb-3">Selected Idea for Enhancement:</h3>
           <button
                onClick={() => onSelectIdea('')} // Crude way to deselect, ideally improve state management in App.tsx
                className="mb-4 px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-md shadow"
              >
                ← Back to Idea List
            </button>
          <div className="space-y-4 p-4 bg-slate-700/80 rounded-lg">
            <div>
              <h4 className="text-md font-semibold text-purple-300 mb-1">Logline:</h4>
              <p className="text-slate-200 bg-slate-600/50 p-2 rounded-md text-sm italic gb-content-area">{selectedIdea.logline}</p>
            </div>
            
            <div>
              <h4 className="text-md font-semibold text-purple-300 mb-1">Synopsis:</h4>
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-600/50 p-2 rounded-md text-sm gb-content-area">{selectedIdea.synopsis}</p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-purple-300 mb-1">Key Character Ideas:</h4>
              <div className="space-y-2">
                {selectedIdea.characterIdeas.map((char, index) => (
                  <div key={index} className="p-2 bg-slate-600/40 border border-slate-500/50 rounded-md gb-content-area">
                    <h5 className="font-semibold text-purple-200 text-sm">{char.name}</h5>
                    <p className="text-slate-300 text-xs mt-0.5">{char.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-md font-semibold text-purple-300 mb-1">Key Scene Ideas:</h4>
              <div className="space-y-2">
                {selectedIdea.sceneIdeas.map((scene, index) => (
                  <div key={index} className="p-2 bg-slate-600/40 border border-slate-500/50 rounded-md gb-content-area">
                    <h5 className="font-semibold text-purple-200 text-sm">{scene.title}</h5>
                    <p className="text-slate-300 text-xs mt-0.5">{scene.description}</p>
                  </div>
                ))}
              </div>
            </div>
             {/* Mind Map Display */}
            <StoryMindMap mindMapMarkdown={selectedIdea.mindMapMarkdown} isLoading={isEnhancing} />
          </div>

          {/* Enhancement Form */}
          <form onSubmit={handleEnhanceSubmit} className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-purple-600/50">
            <h4 className="text-lg font-semibold text-purple-300 mb-2">Enhance this Idea:</h4>
            <div>
              <label htmlFor="enhancementPrompt" className="block text-sm font-medium text-purple-300 mb-1">
                Your Enhancement Instructions:
              </label>
              <textarea
                id="enhancementPrompt"
                value={enhancementPrompt}
                onChange={(e) => setEnhancementPrompt(e.target.value)}
                placeholder="e.g., Make the protagonist a former spy, add a mysterious artifact, change the ending to be bittersweet..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors text-slate-100 placeholder-slate-400 resize-y"
                aria-label="Enhancement prompt for selected story idea"
              />
            </div>
            <div className="mt-3 text-center">
              <button
                type="submit"
                disabled={isEnhancing || !enhancementPrompt.trim() || isLoading}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
              >
                {isEnhancing ? (
                  <> <LoadingSpinner size="sm" /> Enhancing Idea...</>
                ) : (
                  <> <SparklesIcon className="w-5 h-5 mr-2" /> Enhance Idea</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
