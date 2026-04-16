
import React from 'react';

interface FooterProps {
  // No props needed now
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-slate-950/40 text-center p-6 mt-12 border-t border-fuchsia-500/20">
      <p className="text-sm text-slate-300">
        &copy; {new Date().getFullYear()} Greybrainer Groq Lab. Experimental publishing sandbox.
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Separate from the stable Netlify experience and intended for controlled experimentation.
      </p>
    </footer>
  );
};
