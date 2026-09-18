"use client";

import Link from 'next/link';
import { useGetOrganization, getGetOrganizationQueryKey } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Building2, Shield, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { MembersTab } from './components/members-tab';
import { InvitationsTab } from './components/invitations-tab';
import { AuthoritiesTab } from './components/authorities-tab';

export default function OrganizationDetail() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: org, isLoading, error } = useGetOrganization(id, {
    query: { enabled: !!id, queryKey: getGetOrganizationQueryKey(id) }
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !org) {
    return (
      <ProtectedRoute>
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to organizations
            </Link>
          </div>
          <Card className="border-destructive/20 bg-destructive/5 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-destructive">Organization not found</CardTitle>
              <CardDescription>The organization you are looking for does not exist or you do not have permission to view it.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const isOwner = org.membershipRoles.includes('Owner');
  const isAdmin = org.membershipRoles.includes('Admin');

  return (
    <ProtectedRoute>
      <div className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-5xl animate-in fade-in duration-500">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to organizations
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/5 p-4 rounded-xl shrink-0 border border-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-2">
                  {org.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    Your role: {org.membershipRoles.join(', ')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Established {format(new Date(org.createdAt), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] lg:w-[500px] mb-8 lg:grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            {isOwner && <TabsTrigger value="authorities">Authority</TabsTrigger>}
          </TabsList>

          <TabsContent value="members" className="focus-visible:outline-none">
            <MembersTab organizationId={id} isOwner={isOwner} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="invitations" className="focus-visible:outline-none">
            <InvitationsTab organizationId={id} isAdmin={isAdmin || isOwner} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="authorities" className="focus-visible:outline-none">
              <AuthoritiesTab organizationId={id} isOwner={isOwner} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}