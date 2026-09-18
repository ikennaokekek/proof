"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useAcceptInvitation } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, MailCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function AcceptInvitationContent() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();
  
  const [token, setToken] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const accept = useAcceptInvitation();

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = fragment.get('token');
    if (fragmentToken) setToken(fragmentToken);
    if (!isAuthLoading && (!session || !session.authenticated)) {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.hash);
      router.replace(`/?returnTo=${currentUrl}`);
    }
  }, [session, isAuthLoading, router]);

  const handleAccept = () => {
    setErrorMsg(null);
    if (!token.trim()) {
      setErrorMsg("Please enter an invitation token.");
      return;
    }

    accept.mutate({
      data: { token: token.trim() }
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        toast.success("Invitation accepted successfully");
      },
      onError: (error) => {
        setErrorMsg(error.data?.error || "Failed to accept invitation. It may be invalid, expired, or for a different account.");
      }
    });
  };

  if (isAuthLoading || (!session || !session.authenticated)) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
        <Card className="w-full max-w-md border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-serif text-emerald-700">Invitation Accepted</CardTitle>
            <CardDescription className="text-emerald-600/80">
              You have successfully joined the organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-6 pb-8">
            <Link href="/">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif tracking-tight">Accept Invitation</CardTitle>
          <CardDescription>
            Join an organization on PROOF. You are signed in as <span className="font-medium text-foreground">{session.user?.email}</span>.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {errorMsg && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-lg text-sm flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="token">Invitation Token</Label>
            <Input 
              id="token" 
              value={token} 
              onChange={(e) => setToken(e.target.value)} 
              placeholder="Paste your one-time token here"
              className="font-mono text-sm"
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleAccept}
            disabled={accept.isPending || !token.trim()}
          >
            {accept.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Accept & Join Organization
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}