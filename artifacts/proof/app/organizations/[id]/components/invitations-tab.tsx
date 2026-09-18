"use client";

import { useState } from 'react';
import { 
  useListOrganizationInvitations, 
  useCreateOrganizationInvitation, 
  useRevokeOrganizationInvitation,
  getListOrganizationInvitationsQueryKey,
  InvitationInputRolesItem,
  InvitationStatus
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2, Mail, Copy, Check, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface InvitationsTabProps {
  organizationId: string;
  isAdmin: boolean;
}

export function InvitationsTab({ organizationId, isAdmin }: InvitationsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: invitations, isLoading, error } = useListOrganizationInvitations(organizationId);

  if (isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !invitations) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load invitations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'accepted': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'revoked': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'expired': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium tracking-tight">Active & Past Invitations</h3>
          <p className="text-sm text-muted-foreground">Manage organization access invitations.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/40">
        {invitations.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Mail className="h-8 w-8 mb-3 opacity-20" />
            <p>No invitations found.</p>
            <p className="text-sm mt-1">Invite team members to join this organization.</p>
          </div>
        ) : (
          invitations.map(invitation => (
            <div key={invitation.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
              <div>
                <div className="font-medium text-foreground flex items-center gap-2">
                  {invitation.email}
                  <span className={`text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-sm border ${getStatusColor(invitation.status)}`}>
                    {invitation.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="font-medium text-foreground">{invitation.job_title}</span>
                  <span>•</span>
                  <span>Invited {format(new Date(invitation.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-3 shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {invitation.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {role}
                    </span>
                  ))}
                </div>
                {isAdmin && invitation.status === 'pending' && (
                  <RevokeButton organizationId={organizationId} invitationId={invitation.id} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isCreateOpen && (
        <CreateInvitationDialog 
          organizationId={organizationId} 
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}
    </div>
  );
}

function RevokeButton({ organizationId, invitationId }: { organizationId: string, invitationId: string }) {
  const queryClient = useQueryClient();
  const revoke = useRevokeOrganizationInvitation();

  const handleRevoke = () => {
    revoke.mutate({
      organizationId,
      invitationId
    }, {
      onSuccess: () => {
        toast.success("Invitation revoked");
        queryClient.invalidateQueries({ queryKey: getListOrganizationInvitationsQueryKey(organizationId) });
      },
      onError: (error) => {
        toast.error(error.data?.error || "Failed to revoke invitation");
      }
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleRevoke}
      disabled={revoke.isPending}
    >
      {revoke.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
      Revoke
    </Button>
  );
}

function CreateInvitationDialog({ 
  organizationId, 
  open, 
  onOpenChange 
}: { 
  organizationId: string;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roles, setRoles] = useState<InvitationInputRolesItem[]>([]);
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const createInvite = useCreateOrganizationInvitation();

  const handleCreate = () => {
    if (!email || !jobTitle || roles.length === 0) {
      toast.error("Please fill out all fields");
      return;
    }

    createInvite.mutate({
      organizationId,
      data: {
        email,
        jobTitle,
        roles
      }
    }, {
      onSuccess: (data) => {
        setSuccessToken(data.token);
        queryClient.invalidateQueries({ queryKey: getListOrganizationInvitationsQueryKey(organizationId) });
      },
      onError: (error) => {
        toast.error(error.data?.error || "Failed to create invitation");
      }
    });
  };

  const copyToClipboard = () => {
    if (!successToken) return;
    const origin = window.location.origin;
    const acceptUrl = `${origin}/invitations/accept#token=${encodeURIComponent(successToken)}`;
    navigator.clipboard.writeText(acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invitation link copied to clipboard");
  };

  const toggleRole = (role: InvitationInputRolesItem) => {
    setRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const allowedRoles: { role: InvitationInputRolesItem; desc: string }[] = [
    { role: 'Requester', desc: 'Can initiate requests' },
    { role: 'Approver', desc: 'Eligible for approval authority grants' },
    { role: 'Auditor', desc: 'Read-only access to records' },
  ];

  if (successToken) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              Invitation Created
            </DialogTitle>
            <DialogDescription>
              PROOF does not send emails in Slice 2. You must securely share this one-time link with the invitee.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-4 rounded-lg text-sm">
              <span className="font-medium block mb-1">Important</span>
              This link contains a one-time secure token. It will not be shown again and cannot be recovered.
            </div>
            
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/invitations/accept#token=${encodeURIComponent(successToken)}`} 
                  className="font-mono text-xs text-muted-foreground bg-muted/50"
                />
                <Button onClick={copyToClipboard} variant="outline" className="shrink-0 w-24">
                  {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Create an invitation for a new member. They will need a PROOF account to accept it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="colleague@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input 
              id="jobTitle" 
              value={jobTitle} 
              onChange={(e) => setJobTitle(e.target.value)} 
              placeholder="e.g. Senior Analyst"
            />
          </div>

          <div className="space-y-3">
            <Label>Roles (Ordinary only)</Label>
            <div className="grid gap-3 border rounded-lg p-4 bg-muted/20">
              {allowedRoles.map(({ role, desc }) => (
                <div key={role} className="flex items-start space-x-3">
                  <Checkbox 
                    id={`invite-role-${role}`} 
                    checked={roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label 
                      htmlFor={`invite-role-${role}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createInvite.isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createInvite.isPending || !email || !jobTitle || roles.length === 0}>
            {createInvite.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}