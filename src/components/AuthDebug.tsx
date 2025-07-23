import { useAuth } from '../auth/useAuth';
import { useState, useEffect } from 'react';

export function AuthDebug() {
  const { user, loading, error, isInTeams } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    // Intercept console logs
    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      if (message.includes('[Auth]')) {
        setLogs(prev => [...prev, `LOG: ${message}`]);
      }
    };
    
    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      if (message.includes('[Auth]') || message.includes('Teams')) {
        setLogs(prev => [...prev, `ERROR: ${message}`]);
      }
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      maxHeight: '200px', 
      overflow: 'auto',
      background: 'black', 
      color: 'lime', 
      fontSize: '12px',
      fontFamily: 'monospace',
      padding: '10px',
      zIndex: 9999
    }}>
      <div>Auth State: {loading ? 'LOADING' : user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}</div>
      <div>In Teams: {String(isInTeams)}</div>
      <div>User: {user ? user.userDetails : 'null'}</div>
      {error && <div>Error: {error.message}</div>}
      <hr style={{ borderColor: 'lime' }} />
      <div>Console Logs:</div>
      {logs.map((log, i) => <div key={i}>{log}</div>)}
    </div>
  );
}