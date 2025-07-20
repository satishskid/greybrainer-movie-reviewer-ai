
import React from 'react';

export const BeakerIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 2.25H9.75a.75.75 0 00-.75.75v1.5H7.5a.75.75 0 00-.75.75v1.5H5.25a.75.75 0 00-.75.75V9H3.75a.75.75 0 00-.75.75v1.5H1.5a.75.75 0 00-.75.75V15H.75a.75.75 0 00-.75.75v1.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75v-1.5H3a.75.75 0 00.75-.75V15h.75a.75.75 0 00.75-.75v-1.5H6A.75.75 0 006.75 12V9.75h.75a.75.75 0 00.75-.75V7.5h.75A.75.75 0 009.75 6V4.5h1.5V3a.75.75 0 00.75-.75V1.5A.75.75 0 0012 .75H9.75M14.25 2.25c.392 0 .75.204.75.51v.245c0 .306.358.51.75.51h.001c.392 0 .75-.204.75-.51V2.76c0-.306-.358-.51-.75-.51h-.001a.755.755 0 00-.75.51V3.75c0 .414.336.75.75.75h2.25a.75.75 0 00.75-.75V3c0-.414-.336-.75-.75-.75h-2.25a.75.75 0 01-.75-.75V2.25zM8.25 15V9.75M15.75 15V9.75m-3.75 5.25v-5.25m0 5.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 17.25h16.5M7.5 20.25h9" />
  </svg>
);
// Simplified Beaker Icon
export const SimpleBeakerIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.875c0-1.243-1.007-2.25-2.25-2.25H6.75c-1.243 0-2.25 1.007-2.25 2.25v9.75c0 1.243 1.007 2.25 2.25 2.25h10.5c1.243 0 2.25-1.007 2.25-2.25V7.875z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15.75h9M7.5 12.75h9M7.5 9.75h9M4.5 5.625h15" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 18.75V21M14.25 18.75V21" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.625V3.375M15 5.625V3.375" />
    </svg>
  );
