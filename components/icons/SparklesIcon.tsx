
import React from 'react';

// Interface for props, extending standard SVG attributes
interface SparklesIconProps extends React.SVGProps<SVGSVGElement> {
  // className is part of SVGProps, so it's already optional: string | undefined
  // No need to explicitly redefine it here unless we change its optionality or type.
}

export const SparklesIcon: React.FC<SparklesIconProps> = ({ className: propClassName, ...rest }) => {
  // Default Tailwind classes for styling (e.g., size, color if not overridden by direct attributes)
  const defaultBaseClassName = 'w-6 h-6'; // Default size
  
  // Combine default classes with any classes passed via props
  // Passed className can override defaults if they target the same CSS properties (e.g. different w- class)
  const combinedClassName = `${defaultBaseClassName} ${propClassName || ''}`.trim();

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={combinedClassName} // Apply combined className
      {...rest} // Spread all other props, including potential width, height, x, y, fill, stroke etc.
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 14.188l-1.25-2.188a2.25 2.25 0 00-1.743-1.743L11.812 11l2.188-1.25a2.25 2.25 0 001.743-1.743L17 5.812l1.25 2.188a2.25 2.25 0 001.743 1.743L22.188 11l-2.188 1.25a2.25 2.25 0 00-1.743 1.743z" />
    </svg>
  );
};
