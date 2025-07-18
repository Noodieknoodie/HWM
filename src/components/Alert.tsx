// src/components/Alert.tsx
import React from 'react';

interface AlertProps {
  variant: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  className?: string;
}

const variantStyles = {
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    message: 'text-red-700',
    path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
    path: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700',
    path: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 112 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
  },
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    message: 'text-green-700',
    path: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
  }
};

export const Alert: React.FC<AlertProps> = ({ variant, title, message, className = '' }) => {
  const styles = variantStyles[variant];
  
  return (
    <div className={`border rounded-md p-4 ${styles.container} ${className} animate-fade-in`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d={styles.path} clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
          )}
          <div className={`text-sm ${title ? 'mt-2' : ''} ${styles.message}`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Convenience components
export const ErrorAlert: React.FC<{ message: string; className?: string }> = ({ message, className }) => (
  <Alert variant="error" message={message} className={className} />
);

export const WarningAlert: React.FC<{ title?: string; message: string; className?: string }> = ({ title, message, className }) => (
  <Alert variant="warning" title={title} message={message} className={className} />
);

export const InfoAlert: React.FC<{ title?: string; message: string; className?: string }> = ({ title, message, className }) => (
  <Alert variant="info" title={title} message={message} className={className} />
);

export const SuccessAlert: React.FC<{ title?: string; message: string; className?: string }> = ({ title, message, className }) => (
  <Alert variant="success" title={title} message={message} className={className} />
);