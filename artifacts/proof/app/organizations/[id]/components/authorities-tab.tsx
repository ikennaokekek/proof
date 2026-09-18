"use client";

import { useState } from 'react';
import { 
  useListApprovalAuthorities, 
  useGrantApprovalAuthority, 
  useRevokeApprovalAuthority,
  getListApprovalAuthoritiesQueryKey,
  getListApprovalAuthorityRequestsQueryKey,
  AuthorityCategory,
  useApproveApprovalAuthorityRequest,
  useListApprovalAuthorityRequests,
  useListOrganizationMembers
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, ShieldCheck, ShieldOff, Plus, Key, AlertTriangle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AuthoritiesTabProps {
  organizationId: string;
  isOwner: boolean;
}

export function AuthoritiesTab({ organizationId, isOwner }: AuthoritiesTabProps) {
  const queryClient = useQueryClient();
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  const { data: authorities, isLoading, error } = useListApprovalAuthorities(organizationId);
  const { data: authorityRequests, isLoading: requestsLoading } =
    useListApprovalAuthorityRequests(organizationId, {
      query: {
        queryKey: getListApprovalAuthorityRequestsQueryKey(organizationId),
        refetchInterval: 15_000,
      },
    });
  const revoke = useRevokeApprovalAuthority();
  const approve = useApproveApprovalAuthorityRequest();

  if (isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !authorities) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load approval authorities.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAuthorities = authorities.filter(a => a.active);
  const revokedAuthorities = authorities.filter(a => !a.active);
  const pendingRequests = authorityRequests?.filter(request => request.status === "pending") ?? [];

  const refreshAuthorityState = () => {
    queryClient.invalidateQueries({ queryKey: getListApprovalAuthoritiesQueryKey(organizationId) });
    queryClient.invalidateQueries({ queryKey: getListApprovalAuthorityRequestsQueryKey(organizationId) });
  };

  const handleApprove = (requestId: string) => {
    approve.mutate({ organizationId, requestId }, {
      onSuccess: () => {
        toast.success("Authority granted with independent Owner approval");
        refreshAuthorityState();
      },
      onError: (error) => {
        toast.error(error.data?.error || "This authority request can no longer be approved");
        refreshAuthorityState();
      },
    });
  };

  const handleRevoke = (authorityId: string) => {
    revoke.mutate({
      organizationId,
      authorityId
    }, {
      onSuccess: () => {
        toast.success("Authority revoked");
        setRevokeConfirmId(null);
        queryClient.invalidateQueries({ queryKey: getListApprovalAuthoritiesQueryKey(organizationId) });
      },
      onError: (error) => {
        toast.error(error.data?.error || "Failed to revoke authority");
      }
    });
  };

  const getCategoryLabel = (cat: AuthorityCategory) => {
    switch (cat) {
      case 'payment': return 'Payment Release';
      case 'supplier_bank_detail_change': return 'Supplier Bank Change';
      default: return cat;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium tracking-tight">Active Approval Authorities</h3>
          <p className="text-sm text-muted-foreground">Members with explicitly granted power to approve actions.</p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsGrantOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Grant Authority
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/40">
        {activeAuthorities.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <ShieldCheck className="h-8 w-8 mb-3 opacity-20" />
            <p>No active authorities.</p>
            <p className="text-sm mt-1">Grant authority to active Approvers to allow them to authorize consequential actions.</p>
          </div>
        ) : (
          activeAuthorities.map(authority => (
            <div key={authority.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-500/10 text-emerald-600 p-2.5 rounded-full shrink-0 border border-emerald-500/20">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {getCategoryLabel(authority.category)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Member ID: <span className="font-mono">{authority.member_id.split('-')[0]}...</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Granted {format(new Date(authority.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 border border-emerald-500/20">
                  Active
                </span>
                
                {isOwner && (
                  revokeConfirmId === authority.id ? (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => setRevokeConfirmId(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => handleRevoke(authority.id)}
                        disabled={revoke.isPending}
                      >
                        {revoke.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Confirm Revoke
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRevokeConfirmId(authority.id)}
                    >
                      <ShieldOff className="h-3 w-3 mr-1.5" />
                      Revoke
                    </Button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium tracking-tight">Pending dual-control requests</h3>
          <p className="text-sm text-muted-foreground">
            When more than one Owner is active, a different Owner must approve each authority increase.
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/40">
          {requestsLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No authority increases are waiting for a second Owner.
            </div>
          ) : (
            pendingRequests.map(request => (
              <div key={request.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{getCategoryLabel(request.category)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approver member <span className="font-mono">{request.member_id.split("-")[0]}…</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested {format(new Date(request.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={approve.isPending}
                >
                  {approve.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                  Approve as second Owner
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {revokedAuthorities.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">History</h4>
          <div className="bg-card/50 rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40 opacity-75">
            {revokedAuthorities.map(authority => (
              <div key={authority.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldOff className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-foreground">
                      {getCategoryLabel(authority.category)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Member ID: <span className="font-mono">{authority.member_id.split('-')[0]}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  Revoked {authority.revoked_at ? format(new Date(authority.revoked_at), 'MMM d, yyyy') : 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isGrantOpen && (
        <GrantAuthorityDialog 
          organizationId={organizationId} 
          open={isGrantOpen}
          onOpenChange={setIsGrantOpen}
        />
      )}
    </div>
  );
}

function GrantAuthorityDialog({ 
  organizationId, 
  open, 
  onOpenChange 
}: { 
  organizationId: string;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState("");
  const [category, setCategory] = useState<AuthorityCategory | "">("");
  
  const grant = useGrantApprovalAuthority();
  const { data: members, isLoading } = useListOrganizationMembers(organizationId);

  const handleGrant = () => {
    if (!memberId || !category) {
      toast.error("Please select a member and a category");
      return;
    }

    grant.mutate({
      organizationId,
      data: {
        memberId,
        category: category as AuthorityCategory
      }
    }, {
      onSuccess: (result) => {
        const pending = "status" in result && result.status === "pending";
        toast.success(
          pending
            ? "Authority request sent for independent Owner approval"
            : "Authority granted through sole-owner bootstrap",
        );
        queryClient.invalidateQueries({ queryKey: getListApprovalAuthoritiesQueryKey(organizationId) });
        queryClient.invalidateQueries({ queryKey: getListApprovalAuthorityRequestsQueryKey(organizationId) });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.data?.error || "Failed to grant authority");
      }
    });
  };

  // Only Active members with the Approver role are eligible
  const eligibleMembers = members?.filter(m => m.active && m.roles.includes('Approver')) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Grant Approval Authority</DialogTitle>
          <DialogDescription>
            Request explicit authorization rights for an active Approver. If another Owner is active, they must approve the increase independently.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Select Eligible Member</Label>
            <Select value={memberId} onValueChange={setMemberId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading members..." : "Select an active Approver"} />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No active members with Approver role found.
                  </div>
                ) : (
                  eligibleMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.job_title} ({m.id.split('-')[0]}...)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {eligibleMembers.length === 0 && !isLoading && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                <AlertTriangle className="h-3 w-3" />
                You must assign the Approver role to an active member first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Authority Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as AuthorityCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select authorization scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Payment Release</SelectItem>
                <SelectItem value="supplier_bank_detail_change">Supplier Bank Change</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-sm border">
            <p className="font-medium mb-1">Dual-control notice</p>
            <p className="text-muted-foreground">
              Sole-owner organizations use an audited bootstrap. Otherwise, this request stays pending until a different active Owner approves it.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={grant.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleGrant} 
            disabled={grant.isPending || !memberId || !category || eligibleMembers.length === 0}
          >
            {grant.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Request Authority
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}