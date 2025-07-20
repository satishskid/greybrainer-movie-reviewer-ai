
import React from 'react';

export const LightBulbIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75A2.25 2.25 0 0114.25 9v1.083c-.097.014-.194.029-.292.042M12 6.75A2.25 2.25 0 009.75 9v1.083c.097.014.194.029.292.042m0 0A2.25 2.25 0 0012 12.75m0 0A2.25 2.25 0 019.75 10.5v-1.167M12 12.75c-.096 0-.19-.013-.283-.038M4.921 16.012A7.5 7.5 0 0012 20.25a7.463 7.463 0 004.053-1.076" /> {/* Simplified base and added more glow hints */}
  </svg>
);
