// src/auth/useAuth.local.ts
// Local testing version of useAuth - bypasses Teams authentication

import { useState, useEffect } from 'react';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName?: string;
  userEmail?: string;
  error?: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Simulate auth for local testing
    setTimeout(() => {
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        userName: 'Test User',
        userEmail: 'test@hohimer.com'
      });
    }, 500);
  }, []);

  const signIn = async () => {
    console.log('Mock sign in');
  };

  const signOut = async () => {
    console.log('Mock sign out');
  };

  return { authState, signIn, signOut };
};