
import React from 'react';

export const ClipboardIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a8.966 8.966 0 01-7.884 8.966H4.5A2.25 2.25 0 012.25 18v-2.25m13.332-13.332l-1.667 1.667m-1.667-1.667l1.667 1.667M10.5 21H13.5A2.25 2.25 0 0015.75 18.75V11.25A2.25 2.25 0 0013.5 9H10.5A2.25 2.25 0 008.25 11.25V18.75A2.25 2.25 0 0010.5 21z" />
  </svg>
);