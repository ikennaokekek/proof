"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useGetSession, useSignIn, useSignUp, useSignOut, AuthCredentials, AuthResult, Session } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetSessionQueryKey } from '@workspace/api-client-react';

interface AuthContextType {
  session: Session | undefined;
  isLoading: boolean;
  signIn: (creds: AuthCredentials) => Promise<AuthResult>;
  signUp: (creds: AuthCredentials) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useGetSession();
  const signInMutation = useSignIn();
  const signUpMutation = useSignUp();
  const signOutMutation = useSignOut();

  const signIn = async (creds: AuthCredentials) => {
    const result = await signInMutation.mutateAsync({ data: creds });
    queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
    return result;
  };

  const signUp = async (creds: AuthCredentials) => {
    const result = await signUpMutation.mutateAsync({ data: creds });
    queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
    return result;
  };

  const signOut = async () => {
    await signOutMutation.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
