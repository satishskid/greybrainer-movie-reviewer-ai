import React from 'react';
import { LayerAnalysisData, SummaryReportData, MorphokineticsAnalysis, PersonnelData, FinancialAnalysisData } from '../types';
import { LAYER_DEFINITIONS, MAX_SCORE } from '../constants';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ShareIcon } from './icons/ShareIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface PublishableAnalysisReportProps {
  movieTitle: string;
  layerAnalyses: LayerAnalysisData[];
  summaryReport: SummaryReportData;
  morphokineticsAnalysis?: MorphokineticsAnalysis;
  personnelData?: PersonnelData;
  financialData?: FinancialAnalysisData;
  onClose: () => void;
}

export const PublishableAnalysisReport: React.FC<PublishableAnalysisReportProps> = ({
  movieTitle,
  layerAnalyses,
  summaryReport,
  morphokineticsAnalysis,
  personnelData,
  financialData,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  // Calculate overall score
  const scoredLayers = layerAnalyses.filter(layer => typeof layer.userScore === 'number');
  const overallScore = scoredLayers.length > 0 
    ? (scoredLayers.reduce((sum, layer) => sum + (layer.userScore as number), 0) / scoredLayers.length)
    : null;

  const handleCopyHTML = () => {
    const htmlContent = generateBlogHTML();
    navigator.clipboard.writeText(htmlContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateBlogHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greybrainer-analysis-${movieTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateBlogHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Greybrainer Analysis: ${movieTitle}</title>
    <meta name="description" content="Comprehensive AI-powered film analysis of ${movieTitle} using the Greybrainer methodology - examining Story, Conceptualization, and Performance layers.">
    <meta name="keywords" content="film analysis, movie review, AI analysis, ${movieTitle}, cinema, storytelling">
    <meta property="og:title" content="Greybrainer Analysis: ${movieTitle}">
    <meta property="og:description" content="Comprehensive AI-powered film analysis using the innovative Greybrainer methodology">
    <meta property="og:type" content="article">
    <style>
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fafafa;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            border-bottom: 3px solid #2563eb;
        }
        .title {
            font-size: 2.5em;
            color: #1e40af;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .subtitle {
            font-size: 1.2em;
            color: #64748b;
            font-style: italic;
        }
        .meta-info {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .score-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.1em;
        }
        .layer-analysis {
            margin: 30px 0;
            padding: 25px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 5px solid #10b981;
        }
        .layer-title {
            font-size: 1.4em;
            color: #059669;
            margin-bottom: 15px;
            font-weight: bold;
        }
        .layer-content {
            color: #374151;
            margin-bottom: 15px;
        }
        .layer-score {
            background: #ecfdf5;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            color: #065f46;
        }
        .morphokinetics-section {
            margin: 40px 0;
            padding: 25px;
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border-radius: 10px;
            border: 2px solid #0ea5e9;
        }
        .morphokinetics-title {
            font-size: 1.5em;
            color: #0369a1;
            margin-bottom: 20px;
            text-align: center;
        }
        .summary-section {
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #fefce8, #fef3c7);
            border-radius: 10px;
            border: 2px solid #f59e0b;
        }
        .summary-title {
            font-size: 1.5em;
            color: #d97706;
            margin-bottom: 20px;
            text-align: center;
        }
        .footer {
            margin-top: 50px;
            padding: 20px 0;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
        }
        .methodology-note {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
            font-style: italic;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .title { font-size: 2em; }
            .layer-analysis, .morphokinetics-section, .summary-section { padding: 15px; }
        }
    </style>
</head>
<body>
    <article>
        <header class="header">
            <h1 class="title">Greybrainer Analysis: ${movieTitle}</h1>
            <p class="subtitle">AI-Powered Film Analysis Using the Greybrainer Methodology</p>
            <p style="color: #64748b; margin-top: 10px;">Published on ${currentDate}</p>
        </header>

        <div class="meta-info">
            <p><strong>Analysis Subject:</strong> ${movieTitle}</p>
            ${personnelData?.director ? `<p><strong>Director:</strong> ${personnelData.director}</p>` : ''}
            ${personnelData?.mainCast ? `<p><strong>Main Cast:</strong> ${personnelData.mainCast.join(', ')}</p>` : ''}
            ${overallScore ? `<p><strong>Overall Greybrainer Score:</strong> <span class="score-badge">${overallScore.toFixed(1)}/${MAX_SCORE}</span></p>` : ''}
        </div>

        <div class="methodology-note">
            <p><strong>About the Greybrainer Methodology:</strong> This analysis examines films through three critical layers - Story/Script, Conceptualization, and Performance/Execution - providing a comprehensive evaluation of cinematic elements that contribute to a film's overall impact and artistic merit.</p>
        </div>

        <section>
            <h2 style="color: #1e40af; font-size: 1.8em; margin: 30px 0 20px 0;">Three-Layer Analysis</h2>
            
            <!-- Three-Layer Visualization (Concentric Rings) -->
            <div style="margin-bottom: 40px; text-align: center;">
                <h3 style="color: #1e40af; margin-bottom: 20px;">Layer Score Visualization</h3>
                <svg width="400" height="400" viewBox="0 0 400 400" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <!-- Background circles -->
                    <circle cx="200" cy="200" r="150" fill="none" stroke="#e2e8f0" stroke-width="2"/>
                    <circle cx="200" cy="200" r="100" fill="none" stroke="#e2e8f0" stroke-width="2"/>
                    <circle cx="200" cy="200" r="50" fill="none" stroke="#e2e8f0" stroke-width="2"/>
                    
                    ${layerAnalyses.map((layer, index) => {
                      const aiScore = layer.aiSuggestedScore ?? 5;
                      const userScore = layer.userScore;
                      const angle = (index * 120 - 90) * (Math.PI / 180);
                      const colors = ['#3b82f6', '#10b981', '#f59e0b'];
                      
                      // AI Score visualization
                      const aiRadius = (aiScore / 10) * 150;
                      const aiX = 200 + Math.cos(angle) * aiRadius;
                      const aiY = 200 + Math.sin(angle) * aiRadius;
                      
                      // User Score visualization (if provided)
                      const userRadius = userScore ? (userScore / 10) * 150 : 0;
                      const userX = 200 + Math.cos(angle) * userRadius;
                      const userY = 200 + Math.sin(angle) * userRadius;
                      
                      return `
                        <!-- AI Score line (dashed) -->
                        <line x1="200" y1="200" x2="${aiX}" y2="${aiY}" stroke="${colors[index]}" stroke-width="3" opacity="0.6" stroke-dasharray="5,5"/>
                        <!-- AI Score point -->
                        <circle cx="${aiX}" cy="${aiY}" r="6" fill="${colors[index]}" opacity="0.7"/>
                        
                        ${userScore !== undefined ? `
                          <!-- User Score line (solid) -->
                          <line x1="200" y1="200" x2="${userX}" y2="${userY}" stroke="${colors[index]}" stroke-width="4" opacity="0.9"/>
                          <!-- User Score point -->
                          <circle cx="${userX}" cy="${userY}" r="8" fill="${colors[index]}"/>
                        ` : ''}
                        
                        <!-- Layer label -->
                        <text x="${200 + Math.cos(angle) * 180}" y="${200 + Math.sin(angle) * 180}" 
                              text-anchor="middle" fill="#374151" font-size="14" font-weight="bold">
                          ${layer.id === 'story' ? 'Story' : layer.id === 'conceptualization' ? 'Concept' : 'Performance'}
                        </text>
                        
                        <!-- Score labels -->
                        <text x="${200 + Math.cos(angle) * 200}" y="${200 + Math.sin(angle) * 200 + 15}" 
                              text-anchor="middle" fill="${colors[index]}" font-size="11" font-weight="bold">
                          AI: ${aiScore}/10
                        </text>
                        ${userScore !== undefined ? `
                          <text x="${200 + Math.cos(angle) * 200}" y="${200 + Math.sin(angle) * 200 + 30}" 
                                text-anchor="middle" fill="${colors[index]}" font-size="11" font-weight="bold">
                            User: ${userScore}/10
                          </text>
                        ` : ''}
                      `;
                    }).join('')}
                    
                    <!-- Center point -->
                    <circle cx="200" cy="200" r="6" fill="#64748b"/>
                    
                    <!-- Score rings labels -->
                    <text x="360" y="205" text-anchor="middle" fill="#64748b" font-size="12">10</text>
                    <text x="310" y="205" text-anchor="middle" fill="#64748b" font-size="12">6.7</text>
                    <text x="260" y="205" text-anchor="middle" fill="#64748b" font-size="12">3.3</text>
                    
                    <!-- Legend -->
                    <g transform="translate(20, 350)">
                        <text x="0" y="0" fill="#374151" font-size="12" font-weight="bold">Legend:</text>
                        <line x1="0" y1="15" x2="20" y2="15" stroke="#64748b" stroke-width="3" opacity="0.6" stroke-dasharray="5,5"/>
                        <text x="25" y="19" fill="#64748b" font-size="11">AI Analysis Score</text>
                        <line x1="120" y1="15" x2="140" y2="15" stroke="#64748b" stroke-width="4" opacity="0.9"/>
                        <text x="145" y="19" fill="#64748b" font-size="11">Editor Score</text>
                    </g>
                </svg>
            </div>
            
            ${layerAnalyses.map(layer => {
              const layerDef = LAYER_DEFINITIONS.find(def => def.id === layer.id);
              const aiScore = layer.aiSuggestedScore;
              const userScore = layer.userScore;
              
              return `
                <div class="layer-analysis">
                    <h3 class="layer-title">${layerDef?.title || 'Unknown Layer'}</h3>
                    <p style="color: #6b7280; margin-bottom: 15px; font-style: italic;">${layerDef?.description || ''}</p>
                    <div class="layer-content">${(layer.editedText || layer.aiGeneratedText || 'No analysis available').replace(/\n/g, '<br>')}</div>
                    
                    <!-- Scoring Section -->
                    <div style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <h4 style="color: #1e40af; margin-bottom: 10px; font-size: 1.1em;">📊 Layer Scoring</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            ${aiScore ? `
                                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <div style="color: #3b82f6; font-weight: bold; font-size: 0.9em; margin-bottom: 5px;">🤖 AI Analysis Score</div>
                                    <div style="font-size: 1.4em; font-weight: bold; color: #1e40af;">${aiScore}/${MAX_SCORE}</div>
                                </div>
                            ` : ''}
                            ${userScore !== undefined ? `
                                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <div style="color: #059669; font-weight: bold; font-size: 0.9em; margin-bottom: 5px;">👤 Editor Score</div>
                                    <div style="font-size: 1.4em; font-weight: bold; color: #047857;">${userScore}/${MAX_SCORE}</div>
                                </div>
                            ` : aiScore ? `
                                <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                                    <div style="color: #6b7280; font-weight: bold; font-size: 0.9em; margin-bottom: 5px;">👤 Editor Score</div>
                                    <div style="font-size: 1.1em; color: #6b7280; font-style: italic;">Not provided</div>
                                </div>
                            ` : ''}
                        </div>
                        ${aiScore && userScore !== undefined && aiScore !== userScore ? `
                            <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                                <small style="color: #92400e;">
                                    <strong>Score Difference:</strong> ${Math.abs(userScore - aiScore).toFixed(1)} points 
                                    ${userScore > aiScore ? '(Editor scored higher)' : '(AI scored higher)'}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
              `;
            }).join('')}
        </section>

        ${morphokineticsAnalysis ? `
        <section class="morphokinetics-section">
            <h2 class="morphokinetics-title">🌊 Morphokinetics: Narrative Flow Analysis</h2>
            
            <!-- Morphokinetics Visualization -->
            <div style="margin-bottom: 30px; text-align: center;">
                <svg width="600" height="300" viewBox="0 0 600 300" style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <!-- Grid lines -->
                    ${[0, 2, 4, 6, 8, 10].map(intensity => {
                      const y = 250 - (intensity / 10 * 200);
                      return `<line x1="50" y1="${y}" x2="550" y2="${y}" stroke="#cbd5e1" stroke-width="0.5" opacity="0.5"/>`;
                    }).join('')}
                    
                    <!-- Intensity curve -->
                    <path d="${morphokineticsAnalysis.keyMoments?.map((moment, index) => {
                      const x = 50 + (moment.time * 500);
                      const y = 250 - (moment.intensityScore / 10 * 200);
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ') || 'M 50 250'}" 
                    fill="none" stroke="#0369a1" stroke-width="3"/>
                    
                    <!-- Data points -->
                    ${morphokineticsAnalysis.keyMoments?.map((moment, index) => {
                      const x = 50 + (moment.time * 500);
                      const y = 250 - (moment.intensityScore / 10 * 200);
                      return `<circle cx="${x}" cy="${y}" r="4" fill="#0369a1"/>
                              ${moment.isTwist ? `<text x="${x}" y="${y - 10}" text-anchor="middle" fill="#f59e0b" font-size="12">⚡</text>` : ''}`;
                    }).join('') || ''}
                    
                    <!-- Axes -->
                    <line x1="50" y1="50" x2="50" y2="250" stroke="#64748b" stroke-width="2"/>
                    <line x1="50" y1="250" x2="550" y2="250" stroke="#64748b" stroke-width="2"/>
                    
                    <!-- Labels -->
                    <text x="300" y="280" text-anchor="middle" fill="#475569" font-size="14">Narrative Timeline</text>
                    <text x="25" y="150" text-anchor="middle" fill="#475569" font-size="14" transform="rotate(-90 25 150)">Intensity</text>
                    
                    <!-- Y-axis labels -->
                    <text x="40" y="255" text-anchor="end" fill="#64748b" font-size="12">0</text>
                    <text x="40" y="155" text-anchor="end" fill="#64748b" font-size="12">5</text>
                    <text x="40" y="55" text-anchor="end" fill="#64748b" font-size="12">10</text>
                </svg>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #0369a1; margin-bottom: 10px;">Overall Summary:</h4>
                <p>${morphokineticsAnalysis.overallSummary}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h4 style="color: #0369a1; margin-bottom: 10px;">Timeline Structure:</h4>
                <p>${morphokineticsAnalysis.timelineStructureNotes}</p>
            </div>
            <div>
                <h4 style="color: #0369a1; margin-bottom: 10px;">Key Narrative Moments:</h4>
                <ul style="list-style-type: none; padding: 0;">
                    ${morphokineticsAnalysis.keyMoments?.slice(0, 8).map(moment => `
                        <li style="margin: 8px 0; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 5px;">
                            <strong>${Math.round(moment.time * 100)}% through:</strong> ${moment.eventDescription} 
                            <span style="color: #0369a1;">(Intensity: ${moment.intensityScore}/10)</span>
                            ${moment.isTwist ? ' ⚡ <em>Plot Twist</em>' : ''}
                        </li>
                    `).join('') || '<li>No key moments data available</li>'}
                </ul>
            </div>
        </section>
        ` : ''}

        <section class="summary-section">
            <h2 class="summary-title">📋 Executive Summary</h2>
            <div style="color: #92400e;">
                ${summaryReport.reportText.replace(/\n/g, '<br>')}
            </div>
        </section>

        ${summaryReport.socialSnippets?.twitter || summaryReport.socialSnippets?.linkedin ? `
        <section style="margin: 30px 0; padding: 20px; background: #f1f5f9; border-radius: 8px;">
            <h3 style="color: #374151; margin-bottom: 15px;">Social Media Snippets</h3>
            ${summaryReport.socialSnippets.twitter ? `
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #1d4ed8;">Twitter/X:</h4>
                    <p style="font-style: italic; background: white; padding: 10px; border-radius: 5px;">${summaryReport.socialSnippets.twitter}</p>
                </div>
            ` : ''}
            ${summaryReport.socialSnippets.linkedin ? `
                <div>
                    <h4 style="color: #1d4ed8;">LinkedIn:</h4>
                    <p style="font-style: italic; background: white; padding: 10px; border-radius: 5px;">${summaryReport.socialSnippets.linkedin}</p>
                </div>
            ` : ''}
        </section>
        ` : ''}

        <footer class="footer">
            <p><strong>Greybrainer AI Film Analysis Platform</strong></p>
            <p>This analysis was generated using advanced AI technology and the proprietary Greybrainer methodology.</p>
            <p>For more film analyses and insights, visit our platform.</p>
            <p style="margin-top: 15px; font-size: 0.8em;">
                <em>Disclaimer: This analysis represents AI-generated insights and subjective interpretations. 
                Results should be used for creative discussion and educational purposes.</em>
            </p>
        </footer>
    </article>
</body>
</html>`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📝 Publishable Analysis Report</h2>
              <p className="text-blue-100 mt-1">Ready for blog, LinkedIn, or Medium publication</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📖 Preview</h3>
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-blue-600">Greybrainer Analysis: {movieTitle}</h1>
                <p className="text-gray-600 italic">AI-Powered Film Analysis Using the Greybrainer Methodology</p>
                {overallScore && (
                  <div className="mt-2">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      Overall Score: {overallScore.toFixed(1)}/{MAX_SCORE}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 text-sm">
                <div className="bg-white p-3 rounded border-l-4 border-green-500">
                  <h4 className="font-semibold text-green-700">Three-Layer Analysis</h4>
                  <p className="text-gray-600">Story • Conceptualization • Performance</p>
                </div>
                
                {morphokineticsAnalysis && (
                  <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                    <h4 className="font-semibold text-blue-700">🌊 Morphokinetics Analysis</h4>
                    <p className="text-gray-600">Narrative flow and emotional journey visualization</p>
                  </div>
                )}
                
                <div className="bg-white p-3 rounded border-l-4 border-yellow-500">
                  <h4 className="font-semibold text-yellow-700">📋 Executive Summary</h4>
                  <p className="text-gray-600">Comprehensive analysis and insights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyHTML}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <ClipboardIcon className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy HTML'}
            </button>
            
            <button
              onClick={handleDownloadHTML}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download HTML
            </button>
            
            <div className="flex items-center text-sm text-gray-600 ml-4">
              <ShareIcon className="w-4 h-4 mr-1" />
              Perfect for Medium, LinkedIn, or personal blog
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">📚 Publishing Instructions</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Medium:</strong> Copy HTML and paste into a new story (use HTML import)</li>
              <li>• <strong>LinkedIn:</strong> Copy HTML and convert to rich text for article publishing</li>
              <li>• <strong>Personal Blog:</strong> Download HTML file and upload to your hosting</li>
              <li>• <strong>Social Media:</strong> Use the generated social snippets for posts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};