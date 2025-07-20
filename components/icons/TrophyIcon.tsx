import React from 'react';

export const TrophyIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0012.75 9.75H11.25A3.375 3.375 0 007.5 13.5v4.5m3.75-6.375L11.25 11.25h1.5c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125h-1.5A1.125 1.125 0 009.75 6.375v3.75c0 .621.504 1.125 1.125 1.125h1.5m0 0V21m-9-13.5V21" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h9M7.5 4.5h9" />
  </svg>
);