import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'shimmer';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  className = '',
  variant = 'text',
  animation = 'shimmer'
}) => {
  const baseClasses = 'bg-gray-200 relative overflow-hidden';
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer'
  };
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    >
      {animation === 'shimmer' && (
        <div className="skeleton-shimmer-effect" />
      )}
    </div>
  );
};

// Skeleton container for grouping multiple skeletons
export const SkeletonContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return <div className={`skeleton-container ${className}`}>{children}</div>;
};

// Pre-built skeleton patterns
export const SkeletonText: React.FC<{ lines?: number; width?: string }> = ({ 
  lines = 3, 
  width = '100%' 
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : width}
          height={16}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
      <Skeleton width="40%" height={24} className="mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
};