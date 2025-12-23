import React, { useState } from 'react';
import { Copy, Video, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { 
  generateGeminiCanvasPrompt, 
  generateQuickTeaserPrompt, 
  generateDetailedAnalysisPrompt 
} from '../services/geminiCanvasPromptService';

interface GeminiCanvasExportProps {
  insightContent: string;
  movieTitle?: string;
  layerFocus?: string;
}

type VideoLength = 'short' | 'medium' | 'long';

export default function GeminiCanvasExport({ insightContent, movieTitle, layerFocus }: GeminiCanvasExportProps) {
  const [videoLength, setVideoLength] = useState<VideoLength>('medium');
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const generatePrompt = () => {
    switch (videoLength) {
      case 'short':
        return generateQuickTeaserPrompt(insightContent, movieTitle);
      case 'long':
        return generateDetailedAnalysisPrompt(insightContent, movieTitle, layerFocus);
      case 'medium':
      default:
        return generateGeminiCanvasPrompt({
          insightContent,
          movieTitle,
          layerFocus,
          targetDuration: 60,
          includeVisuals: true
        });
    }
  };

  const handleCopyPrompt = async () => {
    const prompt = generatePrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const handleOpenGemini = () => {
    window.open('https://gemini.google.com', '_blank');
  };

  const videoLengthOptions = [
    { value: 'short' as VideoLength, label: 'Short (30s)', description: 'Quick teaser for Reels/Shorts' },
    { value: 'medium' as VideoLength, label: 'Medium (60s)', description: 'Balanced insight video' },
    { value: 'long' as VideoLength, label: 'Long (2min)', description: 'Detailed analysis' }
  ];

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
      <div className="flex items-center gap-3 mb-4">
        <Video className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-900">Create Video Summary</h3>
      </div>

      <p className="text-gray-700 mb-4">
        Generate a video presentation of this insight for social media sharing using Google Gemini Canvas.
      </p>

      {/* Video Length Selection */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Video Length:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {videoLengthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setVideoLength(option.value)}
              className={`p-3 rounded-lg border-2 transition-all ${
                videoLength === option.value
                  ? 'border-purple-500 bg-purple-100'
                  : 'border-gray-300 bg-white hover:border-purple-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-600 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleCopyPrompt}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Prompt
            </>
          )}
        </button>

        <button
          onClick={handleOpenGemini}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Gemini Canvas
        </button>

        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          {showPrompt ? 'Hide' : 'Preview'} Prompt
        </button>
      </div>

      {/* Prompt Preview */}
      {showPrompt && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300 max-h-96 overflow-y-auto">
          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
            {generatePrompt()}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white p-4 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
            ?
          </span>
          How to Create Your Video:
        </h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Click <strong>"Copy Prompt"</strong> to copy the presentation instructions</li>
          <li>Click <strong>"Open Gemini Canvas"</strong> to launch Google Gemini in a new tab</li>
          <li>Paste the prompt into Gemini and wait for it to generate your presentation</li>
          <li>Review the slides and make any adjustments you'd like</li>
          <li>Export the presentation to <strong>Google Slides</strong> (option in Gemini Canvas)</li>
          <li>In Google Slides, go to <strong>File → Download → Microsoft PowerPoint (.pptx)</strong></li>
          <li>Use PowerPoint, Keynote, or an online tool to <strong>save as MP4 video</strong> with narration</li>
          <li>Share on Instagram Reels, YouTube Shorts, or X/Twitter! 🎬</li>
        </ol>
      </div>

      {/* Tips Section */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>💡 Pro Tip:</strong> After exporting to video, you can use free tools like{' '}
          <a 
            href="https://www.kapwing.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-yellow-900"
          >
            Kapwing
          </a>
          {' '}or{' '}
          <a 
            href="https://www.canva.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-yellow-900"
          >
            Canva
          </a>
          {' '}to add voiceover in Indian English and background music!
        </p>
      </div>
    </div>
  );
}
