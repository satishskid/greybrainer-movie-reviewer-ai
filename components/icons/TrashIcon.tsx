
import React from 'react';

export const TrashIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.243.462 3.032 1.214m0 0a4.5 4.5 0 01-3.032-1.214m0 0L6.002 12m12.004 0L17.998 12M5.7 5.79L4.5 12H19.5L18.3 5.79M12 12V9m0 3H9m3 0h3m-3 0V6.75M9 12H6m3 0V9m0 3v3m0-3h3m-3 0h-3" />
  </svg>
);
