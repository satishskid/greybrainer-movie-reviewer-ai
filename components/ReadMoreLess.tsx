import React, { useState, useMemo } from 'react';

interface ReadMoreLessProps {
  text: string;
  initialVisibleLines: number;
  className?: string;
}

export const ReadMoreLess: React.FC<ReadMoreLessProps> = ({ text, initialVisibleLines, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = useMemo(() => text.split('\n'), [text]);
  const canBeTruncated = lines.length > initialVisibleLines;

  const displayText = useMemo(() => {
    if (!canBeTruncated || isExpanded) {
      return text;
    }
    return lines.slice(0, initialVisibleLines).join('\n');
  }, [text, lines, initialVisibleLines, isExpanded, canBeTruncated]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`whitespace-pre-wrap ${className || ''}`}>
      {displayText}
      {canBeTruncated && (
        <button
          onClick={toggleExpanded}
          className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm ml-1 mt-1 focus:outline-none"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Read Less' : '...Read More'}
        </button>
      )}
    </div>
  );
};
