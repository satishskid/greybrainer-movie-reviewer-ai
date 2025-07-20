import React from 'react';

export const LanguageIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502M9 5.25c2.671 0 5.185.734 7.21 2.004M12.75 2.25A2.625 2.625 0 0010.125 4.875v.375m0 0c0 .323.084.636.248.923M15.375 2.25A2.625 2.625 0 0118 4.875v.375m0 0c0 .323-.084.636-.248.923" />
  </svg>
);