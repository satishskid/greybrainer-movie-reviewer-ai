/**
 * Utility functions for generating poster URLs
 * Uses data URLs to avoid external service dependencies
 */

export class PosterUtils {
  /**
   * Generate a simple colored poster using data URL (no external dependencies)
   */
  static generatePosterUrl(title: string, color: string = '#4A90E2'): string {
    // Create a simple SVG poster
    const shortTitle = title.substring(0, 15);
    const svg = `
      <svg width="150" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="220" fill="${color}"/>
        <text x="75" y="110" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
          <tspan x="75" dy="0">${shortTitle}</tspan>
        </text>
      </svg>
    `;
    
    // Convert to data URL
    const encodedSvg = encodeURIComponent(svg);
    return `data:image/svg+xml,${encodedSvg}`;
  }

  /**
   * Get a color based on movie type and genre
   */
  static getColorForMovie(title: string, type: 'Movie' | 'Web Series' = 'Movie'): string {
    const colors = {
      // Movie colors
      action: '#FF4500',
      comedy: '#FFD700', 
      drama: '#4B0082',
      thriller: '#8B0000',
      romance: '#FF69B4',
      horror: '#2F4F4F',
      // Web series colors
      series: '#000080',
      // Default colors
      default: '#4A90E2'
    };

    const titleLower = title.toLowerCase();
    
    if (type === 'Web Series') return colors.series;
    if (titleLower.includes('action') || titleLower.includes('singham') || titleLower.includes('tiger')) return colors.action;
    if (titleLower.includes('comedy') || titleLower.includes('bhool') || titleLower.includes('khel')) return colors.comedy;
    if (titleLower.includes('thriller') || titleLower.includes('scam') || titleLower.includes('maharaja')) return colors.thriller;
    if (titleLower.includes('horror') || titleLower.includes('stree') || titleLower.includes('bhoot')) return colors.horror;
    if (titleLower.includes('romance') || titleLower.includes('love') || titleLower.includes('premalu')) return colors.romance;
    if (titleLower.includes('drama') || titleLower.includes('rocket') || titleLower.includes('gunjan')) return colors.drama;
    
    return colors.default;
  }

  /**
   * Generate poster URL with appropriate color
   */
  static createMoviePoster(title: string, type: 'Movie' | 'Web Series' = 'Movie'): string {
    const color = this.getColorForMovie(title, type);
    return this.generatePosterUrl(title, color);
  }
}