import React, { useState, useEffect } from 'react';
import { contentService, subscriptionService } from '../services/firebaseConfig';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { MailIcon } from './icons/MailIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { EyeIcon } from './icons/EyeIcon';
import { StarIcon } from './icons/StarIcon';

interface Report {
  id: string;
  title: string;
  type: 'film_review' | 'research' | 'insight';
  greybrainerScore?: number;
  summary: string;
  content: string;
  publishedAt: Date;
  category: string;
  tags: string[];
  viewCount: number;
  featured: boolean;
  posterUrl?: string;
}

interface EnhancedLandingPageProps {
  isPublicView?: boolean;
}

export const EnhancedLandingPage: React.FC<EnhancedLandingPageProps> = ({ isPublicView = true }) => {
  const [latestReviews, setLatestReviews] = useState<Report[]>([]);
  const [latestResearch, setLatestResearch] = useState<Report[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
    loadSubscriberCount();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (isAutoPlaying && latestReviews.length > 1) {
      const interval = setInterval(() => {
        setCurrentReviewIndex(prev => (prev + 1) % latestReviews.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, latestReviews.length]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const [reviews, research] = await Promise.all([
        contentService.getPublishedReports(5),
        contentService.getReportsByStatus('published')
      ]);
      
      setLatestReviews(reviews.filter(r => r.type === 'film_review'));
      setLatestResearch(research.filter(r => r.type === 'research').slice(0, 3));
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriberCount = async () => {
    try {
      const count = await subscriptionService.getSubscriberCount();
      setSubscriberCount(count);
    } catch (error) {
      console.error('Error loading subscriber count:', error);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberEmail.trim()) return;

    setSubscriptionStatus('loading');
    try {
      await subscriptionService.addSubscriber(subscriberEmail, ['reviews', 'research']);
      setSubscriptionStatus('success');
      setSubscriberEmail('');
      setSubscriberCount(prev => prev + 1);
    } catch (error) {
      console.error('Subscription error:', error);
      setSubscriptionStatus('error');
    }
  };

  const nextReview = () => {
    setCurrentReviewIndex(prev => (prev + 1) % latestReviews.length);
    setIsAutoPlaying(false);
  };

  const prevReview = () => {
    setCurrentReviewIndex(prev => (prev - 1 + latestReviews.length) % latestReviews.length);
    setIsAutoPlaying(false);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const currentReview = latestReviews[currentReviewIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading latest content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Greybrainer</h1>
                <p className="text-xs text-slate-600">Film Analysis & Research</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#reviews" className="text-slate-600 hover:text-indigo-600 font-medium">Reviews</a>
              <a href="#research" className="text-slate-600 hover:text-indigo-600 font-medium">Research</a>
              <a href="#archive" className="text-slate-600 hover:text-indigo-600 font-medium">Archive</a>
              <button 
                onClick={() => window.location.href = '/app'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Access Platform
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area - 75% Reviews, 25% Methodology */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Latest Reviews Carousel - 75% width */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                {currentReview ? (
                  <>
                    {/* Carousel Header */}
                    <div className="p-6 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 mb-2">Latest Film Review</h2>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-1" />
                              {formatDate(currentReview.publishedAt)}
                            </span>
                            <span className="flex items-center">
                              <EyeIcon className="w-4 h-4 mr-1" />
                              {currentReview.viewCount.toLocaleString()} views
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={toggleAutoPlay}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title={isAutoPlaying ? 'Pause autoplay' : 'Resume autoplay'}
                          >
                            {isAutoPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={prevReview}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            disabled={latestReviews.length <= 1}
                          >
                            <ChevronLeftIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={nextReview}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            disabled={latestReviews.length <= 1}
                          >
                            <ChevronRightIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Poster */}
                        <div className="md:col-span-1">
                          <div className="aspect-[2/3] bg-slate-200 rounded-lg overflow-hidden">
                            {currentReview.posterUrl ? (
                              <img 
                                src={currentReview.posterUrl} 
                                alt={currentReview.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8m-8 0V1"></path>
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="md:col-span-2">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-2">{currentReview.title}</h3>
                              <div className="flex items-center space-x-2 mb-3">
                                {currentReview.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {currentReview.greybrainerScore && (
                              <div className="text-center">
                                <div className="flex items-center justify-center mb-1">
                                  <StarIcon className="w-6 h-6 text-amber-400 mr-1" />
                                  <span className="text-2xl font-bold text-slate-900">
                                    {currentReview.greybrainerScore.toFixed(1)}
                                  </span>
                                  <span className="text-slate-500 ml-1">/10</span>
                                </div>
                                <p className="text-xs text-slate-600">Greybrainer Score</p>
                              </div>
                            )}
                          </div>

                          <p className="text-slate-700 leading-relaxed mb-6">
                            {currentReview.summary}
                          </p>

                          <div className="flex items-center space-x-4">
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                              Read Full Review
                            </button>
                            <span className="text-sm text-slate-500">
                              {currentReviewIndex + 1} of {latestReviews.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Carousel Indicators */}
                    {latestReviews.length > 1 && (
                      <div className="px-6 pb-4">
                        <div className="flex justify-center space-x-2">
                          {latestReviews.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentReviewIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentReviewIndex ? 'bg-indigo-600' : 'bg-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-slate-500">No reviews available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Methodology Sidebar - 25% width */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sticky top-24">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Our Methodology</h3>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-indigo-600 pl-4">
                    <h4 className="font-semibold text-slate-800 mb-1">📚 Narrative Analysis</h4>
                    <p className="text-sm text-slate-600">Plot structure, character development, thematic depth</p>
                  </div>
                  
                  <div className="border-l-4 border-green-600 pl-4">
                    <h4 className="font-semibold text-slate-800 mb-1">🎨 Creative Vision</h4>
                    <p className="text-sm text-slate-600">Directorial approach, artistic coherence, innovation</p>
                  </div>
                  
                  <div className="border-l-4 border-purple-600 pl-4">
                    <h4 className="font-semibold text-slate-800 mb-1">🎬 Technical Execution</h4>
                    <p className="text-sm text-slate-600">Production quality, cinematography, sound design</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-2">Scoring Framework</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>9.0-10.0</span>
                      <span>Exceptional</span>
                    </div>
                    <div className="flex justify-between">
                      <span>8.0-8.9</span>
                      <span>Excellent</span>
                    </div>
                    <div className="flex justify-between">
                      <span>7.0-7.9</span>
                      <span>Very Good</span>
                    </div>
                    <div className="flex justify-between">
                      <span>6.0-6.9</span>
                      <span>Good</span>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                  Learn More About Our Process
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Research Carousel */}
      <section id="research" className="py-12 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Latest Research & Insights</h2>
            <p className="text-lg text-slate-600">Data-driven analysis of industry trends and innovations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {latestResearch.map((research, index) => (
              <article key={research.id} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                    {research.category}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(research.publishedAt)}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{research.title}</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{research.summary}</p>
                
                <div className="flex items-center justify-between">
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    Read Research →
                  </button>
                  <span className="text-xs text-slate-500">{research.viewCount} views</span>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-8">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Browse Research Archive
            </button>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <section className="py-12 px-4 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Stay Updated with Latest Reviews & Research</h2>
          <p className="text-indigo-100 text-lg mb-8">
            Get notified when we publish new film reviews, research insights, and industry analysis
          </p>

          <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-white focus:border-transparent outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={subscriptionStatus === 'loading'}
                className="bg-white hover:bg-slate-50 text-indigo-600 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {subscriptionStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
          </form>

          {subscriptionStatus === 'success' && (
            <div className="mt-4 flex items-center justify-center text-green-100">
              <CheckIcon className="w-5 h-5 mr-2" />
              Successfully subscribed! Welcome to our community.
            </div>
          )}

          {subscriptionStatus === 'error' && (
            <div className="mt-4 text-red-200">
              Subscription failed. Please try again.
            </div>
          )}

          <p className="text-indigo-200 text-sm mt-6">
            Join {subscriberCount.toLocaleString()} subscribers • No spam, unsubscribe anytime
          </p>
        </div>
      </section>

      {/* Archive Preview */}
      <section id="archive" className="py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Explore Our Archive</h2>
          <p className="text-lg text-slate-600 mb-8">
            Browse our comprehensive collection of film reviews and research publications
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
              <div className="text-2xl font-bold text-indigo-600">150+</div>
              <div className="text-sm text-slate-600">Film Reviews</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
              <div className="text-2xl font-bold text-green-600">45+</div>
              <div className="text-sm text-slate-600">Research Papers</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
              <div className="text-2xl font-bold text-purple-600">25+</div>
              <div className="text-sm text-slate-600">Industry Insights</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border border-slate-200">
              <div className="text-2xl font-bold text-amber-600">12</div>
              <div className="text-sm text-slate-600">Months Coverage</div>
            </div>
          </div>

          <button className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
            Browse Complete Archive
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                </div>
                <span className="text-lg font-bold">Greybrainer</span>
              </div>
              <p className="text-slate-300 mb-4 max-w-md">
                AI-powered film analysis platform providing comprehensive reviews, research insights, 
                and data-driven evaluations for the entertainment industry.
              </p>
              <p className="text-sm text-slate-400">
                © 2024 Greybrainer. All content is AI-generated for educational and analytical purposes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Content</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#reviews" className="hover:text-white">Latest Reviews</a></li>
                <li><a href="#research" className="hover:text-white">Research Papers</a></li>
                <li><a href="#archive" className="hover:text-white">Archive</a></li>
                <li><a href="#methodology" className="hover:text-white">Methodology</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="mailto:research@greybrainer.ai" className="hover:text-white">Research Team</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};