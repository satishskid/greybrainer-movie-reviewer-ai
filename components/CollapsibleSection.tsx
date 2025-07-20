import React, { useState } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  icon?: React.ReactNode; // Optional icon for the header
  titleClassName?: string;
  className?: string; // Class for the main wrapper div
  contentClassName?: string; // Class for the content div
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  initiallyOpen = false,
  icon,
  titleClassName = 'text-base font-semibold text-slate-300',
  className = 'py-2',
  contentClassName = 'pt-2 pb-1'
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={className}>
      <button
        onClick={toggleOpen}
        className="flex items-center justify-between w-full p-2.5 rounded-md hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors duration-150"
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
          <span className={titleClassName}>{title}</span>
        </div>
        {isOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && (
        <div id={`collapsible-content-${title.replace(/\s+/g, '-')}`} className={`${contentClassName} ml-2 pl-4 border-l-2 border-slate-700/70`}>
          {children}
        </div>
      )}
    </div>
  );
};
