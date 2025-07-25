import React, { useEffect, useState } from 'react';

const LoadingVault: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING SECURE CONNECTION');
  
  useEffect(() => {
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 300);

    // Update status text
    const statusInterval = setInterval(() => {
      const statuses = [
        'AUTHENTICATING CREDENTIALS',
        'ACCESSING PORTFOLIO DATABASE',
        'LOADING CLIENT RECORDS',
        'CALCULATING Q4 2024 METRICS',
        'ANALYZING PAYMENT STREAMS',
        'PREPARING DASHBOARD'
      ];
      setStatusText(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #3b82f6 1px, transparent 1px),
            linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }} />
      </div>

      {/* Floating financial symbols */}
      <div className="absolute inset-0 overflow-hidden">
        {[...'$%€£¥₹₽'].map((symbol, i) => (
          <div
            key={i}
            className="absolute text-blue-400 opacity-20 text-4xl font-bold animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          >
            {symbol}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-8">
        {/* Logo area with glow effect */}
        <div className="mb-12 relative">
          <div className="absolute inset-0 blur-3xl bg-blue-500 opacity-30 animate-pulse" />
          <h1 className="text-6xl font-bold text-white mb-2 tracking-wider relative">
            HWM
          </h1>
          <p className="text-blue-300 text-lg tracking-widest">
            WEALTH COMMAND CENTER
          </p>
        </div>

        {/* Vault/Tech visualization */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-30 animate-spin-slow" />
          
          {/* Middle pulsing ring */}
          <div className="absolute inset-4 rounded-full border-2 border-blue-400 opacity-50 animate-pulse" />
          
          {/* Inner tech circle */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 animate-pulse-slow">
            <div className="absolute inset-0 rounded-full bg-black opacity-50" />
            <div className="flex items-center justify-center h-full">
              <span className="text-white text-6xl font-bold">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Progress arc */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progress * 7.54} 754`}
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <p className="text-blue-400 text-sm font-mono animate-pulse">
            {statusText}
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-gray-400 text-xs">
              SECURE CONNECTION ESTABLISHED
            </p>
          </div>
        </div>

        {/* Data stream visualization */}
        <div className="mt-8 font-mono text-xs text-blue-300 opacity-50">
          <div className="space-y-1 max-w-md mx-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="overflow-hidden">
                <div 
                  className="whitespace-nowrap animate-scroll"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  {`CLIENT:${Math.random().toString(36).substr(2, 9)} | AUM:$${Math.floor(Math.random() * 9000000 + 1000000).toLocaleString()} | STATUS:ACTIVE | FEE:0.${Math.floor(Math.random() * 75 + 25)}% | `}
                  {`CLIENT:${Math.random().toString(36).substr(2, 9)} | AUM:$${Math.floor(Math.random() * 9000000 + 1000000).toLocaleString()} | STATUS:ACTIVE | FEE:0.${Math.floor(Math.random() * 75 + 25)}% | `}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(-20px) translateX(10px) rotate(120deg); }
          66% { transform: translateY(20px) translateX(-10px) rotate(240deg); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animate-scroll {
          animation: scroll 15s linear infinite;
        }
        
        .animate-float {
          animation: float 15s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingVault;