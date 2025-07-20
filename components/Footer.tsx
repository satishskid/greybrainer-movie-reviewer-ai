
import React from 'react';

interface FooterProps {
  // No props needed now
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-slate-800/30 text-center p-6 mt-12 border-t border-slate-700">
      <p className="text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Greybrainer AI. Powered by Generative AI.
      </p>
      <p className="text-xs text-slate-500 mt-1">
        For critical analysis and creative insights.
      </p>
    </footer>
  );
};
