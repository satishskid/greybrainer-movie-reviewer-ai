
import React from 'react';

export const TicketIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6.75V17.25c0 .966-.784 1.75-1.75 1.75h-7.5A1.75 1.75 0 015.5 17.25V6.75m11 0c0-.966-.784-1.75-1.75-1.75H7.25c-.966 0-1.75.784-1.75 1.75m11 0H5.5m11 0c.078.006.156.014.232.026M5.5 6.75c-.078.006-.156.014-.232.026m10.964 0l2.232-1.332a1.05 1.05 0 000-1.868l-2.232-1.332M5.732 6.776L3.5 5.444a1.05 1.05 0 000-1.868L5.732 2.244M12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 10.5h16.5M3.75 14.25h16.5" />
  </svg>
);
