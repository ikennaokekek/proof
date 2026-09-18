"use client";

import { useState } from 'react';
import { useListOrganizationMembers, useUpdateOrganizationMember, getListOrganizationMembersQueryKey, Member, ProofRole } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Loader2, ShieldAlert, Search, Shield, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface MembersTabProps {
  organizationId: string;
  isOwner: boolean;
  isAdmin: boolean;
}

export function MembersTab({ organizationId, isOwner, isAdmin }: MembersTabProps) {
  const queryClient = useQueryClient();
  const canManage = isOwner || isAdmin;
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { data: members, isLoading, error } = useListOrganizationMembers(organizationId);

  if (isLoading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !members) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <p>Failed to load members.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredMembers = members.filter(m => 
    m.job_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter members..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border/40">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No members found matching your search.
          </div>
        ) : (
          filteredMembers.map(member => (
            <div key={member.id} className={`p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${!member.active ? 'bg-muted/30 opacity-75' : 'hover:bg-muted/10'}`}>
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-border shrink-0">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                    {member.roles[0]?.slice(0, 2).toUpperCase() ?? 'MB'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {member.job_title}
                    {!member.active && (
                      <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive">
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                    ID: <span className="font-mono text-xs">{member.id.split('-')[0]}...</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-3 shrink-0 md:ml-4">
                <div className="flex flex-wrap gap-1.5">
                  {member.roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        role === 'Owner' || role === 'Admin' 
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                  </span>
                  {canManage && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingMember(member)}
                    >
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editingMember && (
        <EditMemberDialog 
          member={editingMember} 
          organizationId={organizationId} 
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            queryClient.invalidateQueries({ queryKey: getListOrganizationMembersQueryKey(organizationId) });
          }}
        />
      )}
    </div>
  );
}

function EditMemberDialog({ 
  member, 
  organizationId, 
  open, 
  onOpenChange,
  onSuccess 
}: { 
  member: Member; 
  organizationId: string;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [jobTitle, setJobTitle] = useState(member.job_title);
  const [active, setActive] = useState(member.active);
  const [roles, setRoles] = useState<ProofRole[]>(member.roles);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  
  const updateMember = useUpdateOrganizationMember();

  const handleSave = () => {
    if (roles.length === 0) {
      toast.error("A member must have at least one role");
      return;
    }

    if (member.active && !active && !confirmSuspend) {
      setConfirmSuspend(true);
      return;
    }

    updateMember.mutate({
      organizationId,
      memberId: member.id,
      data: {
        jobTitle,
        active,
        roles
      }
    }, {
      onSuccess: () => {
        toast.success("Member updated successfully");
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.data?.error || "Failed to update member");
      }
    });
  };

  const toggleRole = (role: ProofRole) => {
    setRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const allRoles: { role: ProofRole; desc: string }[] = [
    { role: 'Owner', desc: 'Full organization and authority control' },
    { role: 'Admin', desc: 'Manage members and invitations' },
    { role: 'Requester', desc: 'Can initiate requests' },
    { role: 'Approver', desc: 'Eligible for approval authority grants' },
    { role: 'Auditor', desc: 'Read-only access to records' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Member</DialogTitle>
          <DialogDescription>
            Update roles, job title, and membership status.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
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
            <Label>Roles</Label>
            <div className="grid gap-3 border rounded-lg p-4 bg-muted/20">
              {allRoles.map(({ role, desc }) => (
                <div key={role} className="flex items-start space-x-3">
                  <Checkbox 
                    id={`role-${role}`} 
                    checked={roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label 
                      htmlFor={`role-${role}`}
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
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-accent/50 p-2 rounded border">
              <Shield className="h-3 w-3" />
              Note: The Approver role indicates eligibility; actual authority must be explicitly granted in the Authority tab.
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2 border rounded-lg p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Suspended members cannot access the organization.
              </p>
            </div>
            <Switch 
              checked={active} 
              onCheckedChange={(v) => {
                setActive(v);
                if (v) setConfirmSuspend(false);
              }} 
            />
          </div>

          {confirmSuspend && !active && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-lg text-sm flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Confirm Suspension</p>
                <p className="opacity-90">Are you sure you want to suspend this member? They will immediately lose access.</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMember.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMember.isPending || roles.length === 0 || !jobTitle.trim()}>
            {updateMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmSuspend && !active ? 'Confirm Suspension' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}