"use client";

import { useListOrganizations } from '@workspace/api-client-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: organizations, isLoading, error } = useListOrganizations();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 container mx-auto px-4 py-8">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load organizations</CardTitle>
            <CardDescription>There was a problem communicating with the server.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasOrganizations = organizations && organizations.length > 0;

  return (
    <div className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">Your Organizations</h1>
          <p className="text-muted-foreground">
            View the organizations where you have an active membership.
          </p>
        </div>
        {hasOrganizations && (
          <Button asChild className="shrink-0 gap-2">
            <Link href="/organizations/new">
              <Plus className="h-4 w-4" />
              Establish Organization
            </Link>
          </Button>
        )}
      </div>

      {!hasOrganizations ? (
        <Card className="border-dashed border-2 shadow-none bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-primary/5 p-4 rounded-full mb-2">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-serif font-medium">No organizations established</h2>
              <p className="text-muted-foreground text-sm text-balance">
                You have not established an organization yet. Create one to set up
                its initial Owner membership.
              </p>
            </div>
            <div className="pt-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/organizations/new">
                  <Plus className="h-4 w-4" />
                  Establish Organization
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`} className="block h-full">
              <Card className="group h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md hover-elevate">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="bg-primary/5 p-2 rounded-md">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                  <CardTitle className="text-xl line-clamp-1">{org.name}</CardTitle>
                  <CardDescription className="line-clamp-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">{org.jobTitle}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {org.membershipRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Established {format(new Date(org.createdAt), 'MMMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
