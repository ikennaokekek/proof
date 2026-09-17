"use client";

import Link from 'next/link';
import { useGetOrganization, Membership, getGetOrganizationQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Building2, Shield, Users, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useParams } from 'next/navigation';

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
                    Your job title: {org.jobTitle}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-medium flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Members
              </h2>
              <div className="text-sm text-muted-foreground">
                {org.members.length} {org.members.length === 1 ? 'Member' : 'Members'}
              </div>
            </div>
            
            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden divide-y divide-border/40">
              {org.members.map((member: Membership) => (
                <div key={member.userId} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs">
                        {member.roles[0]?.slice(0, 2).toUpperCase() ?? 'ME'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {member.jobTitle}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Active organization membership
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end gap-2 shrink-0 md:ml-4">
                    <div className="flex flex-wrap gap-1.5">
                      {member.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Joined {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 bg-primary/5 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Slice 1 boundary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This page shows the organization and active memberships available
                  to your authenticated account. Organization creation is separate
                  from verified identity. Slice 1 does not create authorization
                  evidence or verify the organization.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
