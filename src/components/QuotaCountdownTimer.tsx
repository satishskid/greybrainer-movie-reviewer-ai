import React, { useState, useEffect } from 'react';
import { getDetailedQuotaInfo } from '../../services/geminiService';

interface QuotaCountdownTimerProps {
  className?: string;
  showIcon?: boolean;
}

const QuotaCountdownTimer: React.FC<QuotaCountdownTimerProps> = ({ 
  className = '', 
  showIcon = true 
}) => {
  const [quotaInfo, setQuotaInfo] = useState<{
    isExceeded: boolean;
    resetTime?: Date;
    timeRemaining?: {
      hours: number;
      minutes: number;
      seconds: number;
      totalMs: number;
    };
    nextWindowFormatted?: string;
  }>({ isExceeded: false });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateQuotaInfo = () => {
      const info = getDetailedQuotaInfo();
      setQuotaInfo(info);
      setCurrentTime(new Date());
    };

    // Update immediately
    updateQuotaInfo();

    // Update every second when quota is exceeded
    const interval = setInterval(updateQuotaInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!quotaInfo.isExceeded) {
    return (
      <div className={`quota-status available ${className}`}>
        {showIcon && <span className="status-icon">✅</span>}
        <span className="status-text">Gemini API Available</span>
      </div>
    );
  }

  const { timeRemaining, resetTime } = quotaInfo;

  if (!timeRemaining || !resetTime) {
    return (
      <div className={`quota-status available ${className}`}>
        {showIcon && <span className="status-icon">✅</span>}
        <span className="status-text">Gemini API Available</span>
      </div>
    );
  }

  const formatTime = (time: { hours: number; minutes: number; seconds: number }) => {
    const parts = [];
    if (time.hours > 0) parts.push(`${time.hours}h`);
    if (time.minutes > 0) parts.push(`${time.minutes}m`);
    parts.push(`${time.seconds}s`);
    return parts.join(' ');
  };

  const getProgressPercentage = () => {
    if (!resetTime) return 0;
    
    // Assume 24-hour quota window
    const totalQuotaWindow = 24 * 60 * 60 * 1000; // 24 hours in ms
    const elapsed = totalQuotaWindow - timeRemaining.totalMs;
    return Math.min(100, Math.max(0, (elapsed / totalQuotaWindow) * 100));
  };

  return (
    <div className={`quota-status exceeded ${className}`}>
      <div className="quota-header">
        {showIcon && <span className="status-icon">⏰</span>}
        <span className="status-text">Gemini API Quota Exceeded</span>
      </div>
      
      <div className="countdown-display">
        <div className="time-remaining">
          <span className="countdown-label">Reset in:</span>
          <span className="countdown-time">{formatTime(timeRemaining)}</span>
        </div>
        
        <div className="reset-time">
          <span className="reset-label">Available at:</span>
          <span className="reset-timestamp">
            {resetTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </span>
        </div>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
      
      <div className="quota-tips">
        <small>
          💡 Tip: Wait for reset, upgrade your plan, or check usage in Google AI Studio
        </small>
      </div>
    </div>
  );
};

export default QuotaCountdownTimer;