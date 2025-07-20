import React from 'react';

export const MotionIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75zM12 3.75h.008v.008H12V3.75zM7.5 3.75h.008v.008H7.5V3.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25h10.5M6.75 12h10.5" />
    {/* Adding a dynamic wave/pulse element */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75s.75-.75 1.5-.75 1.5.75 1.5.75S13.5 12 15 12" />
  </svg>
);
// Alternative simple motion icon:
export const AltMotionIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 9.75h9.75M10.5 13.5h9.75M10.5 17.25h9.75M4.5 6.75a.75.75 0 100-1.5.75.75 0 000 1.5zM4.5 11.25a.75.75 0 100-1.5.75.75 0 000 1.5zM4.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM4.5 20.25a.75.75 0 100-1.5.75.75 0 000 1.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.364 6.364l11.272 11.272M6.364 17.636L17.636 6.364" /> {/* Suggests change/dynamics */}
    </svg>
  );