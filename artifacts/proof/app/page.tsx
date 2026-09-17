"use client";

import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import AuthPage from '@/components/AuthPage';

export default function Home() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session?.authenticated) {
    return <Dashboard />;
  }

  return <AuthPage />;
}
