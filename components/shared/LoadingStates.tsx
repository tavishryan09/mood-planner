/**
 * Reusable loading state components
 * Provides consistent loading UI across the application
 */

import React from 'react';
import { SpinnerIcon } from './Icons';

export const ModalSkeleton: React.FC = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-base-100 rounded-lg p-6 w-full max-w-2xl">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-64 w-full mb-4" />
      <div className="flex gap-2 justify-end">
        <div className="skeleton h-10 w-24" />
        <div className="skeleton h-10 w-24" />
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton h-12 w-full" />
    ))}
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="card bg-base-200 p-4 space-y-3">
    <div className="skeleton h-6 w-3/4" />
    <div className="skeleton h-4 w-full" />
    <div className="skeleton h-4 w-2/3" />
  </div>
);

export const LoadingSpinner: React.FC<{ text?: string; className?: string }> = ({
  text = 'Loading...',
  className = ''
}) => (
  <div className={`flex items-center justify-center gap-2 ${className}`}>
    <SpinnerIcon className="w-6 h-6" />
    {text && <span>{text}</span>}
  </div>
);

export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner text={text} className="text-lg" />
  </div>
);

export const InlineLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return <SpinnerIcon className={sizeClasses[size]} />;
};
