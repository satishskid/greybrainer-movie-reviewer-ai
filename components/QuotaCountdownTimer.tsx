import React, { useState, useEffect } from 'react';
import { getDetailedQuotaInfo } from '../services/geminiService';

interface QuotaCountdownTimerProps {
  className?: string;
  showWhenAvailable?: boolean;
}

const QuotaCountdownTimer: React.FC<QuotaCountdownTimerProps> = ({ 
  className = '', 
  showWhenAvailable = false 
}) => {
  const [quotaInfo, setQuotaInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateQuotaInfo = () => {
      const info = getDetailedQuotaInfo();
      setQuotaInfo(info);
      setIsVisible(info.isExceeded || showWhenAvailable);
    };

    // Initial check
    updateQuotaInfo();

    // Update every second when quota is exceeded
    const interval = setInterval(updateQuotaInfo, 1000);

    return () => clearInterval(interval);
  }, [showWhenAvailable]);

  if (!isVisible || !quotaInfo) {
    return null;
  }

  const formatTime = (time: { hours: number; minutes: number; seconds: number }) => {
    const parts: string[] = [];
    if (time.hours > 0) parts.push(`${time.hours}h`);
    if (time.minutes > 0) parts.push(`${time.minutes}m`);
    parts.push(`${time.seconds}s`);
    return parts.join(' ');
  };

  const getStatusColor = () => {
    if (!quotaInfo.isExceeded) return 'text-green-600';
    if (quotaInfo.timeRemaining?.totalMs < 300000) return 'text-orange-600'; // Less than 5 minutes
    return 'text-red-600';
  };

  const getBackgroundColor = () => {
    if (!quotaInfo.isExceeded) return 'bg-green-50 border-green-200';
    if (quotaInfo.timeRemaining?.totalMs < 300000) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${getBackgroundColor()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            quotaInfo.isExceeded ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`}></div>
          <span className="font-medium text-gray-700">
            {quotaInfo.isExceeded ? 'Gemini API Quota Exceeded' : 'Gemini API Available'}
          </span>
        </div>
        
        {quotaInfo.isExceeded && quotaInfo.timeRemaining && (
          <div className={`font-mono text-lg font-bold ${getStatusColor()}`}>
            {formatTime(quotaInfo.timeRemaining)}
          </div>
        )}
      </div>
      
      {quotaInfo.isExceeded && (
        <div className="mt-2 text-sm text-gray-600">
          <p>Quota will reset at: {quotaInfo.resetTime?.toLocaleString()}</p>
          <div className="mt-2 text-xs text-gray-500">
            💡 While waiting, you can still use Brave Search for movie discovery
          </div>
        </div>
      )}
      
      {!quotaInfo.isExceeded && showWhenAvailable && (
        <div className="mt-2 text-sm text-green-600">
          ✅ All Gemini AI features are available
        </div>
      )}
    </div>
  );
};

export default QuotaCountdownTimer;