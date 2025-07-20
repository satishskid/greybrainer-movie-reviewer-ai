
import React from 'react';

// Interface for props, extending standard SVG attributes
interface ArrowTrendingUpIconProps extends React.SVGProps<SVGSVGElement> {
  // className is part of SVGProps
}

export const ArrowTrendingUpIcon: React.FC<ArrowTrendingUpIconProps> = ({ className: propClassName, ...rest }) => {
  const defaultBaseClassName = 'w-6 h-6'; // Default size
  const combinedClassName = `${defaultBaseClassName} ${propClassName || ''}`.trim();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={combinedClassName}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28L19.26 11.25" />
    </svg>
  );
};
