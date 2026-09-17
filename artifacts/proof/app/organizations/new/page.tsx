"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateOrganization, OrganizationInputEstablishmentCapacity } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Building, Briefcase, Shield } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const capacityLabels: Record<OrganizationInputEstablishmentCapacity, string> = {
  chief_executive: 'Chief Executive',
  business_owner: 'Business Owner',
  chief_financial_officer: 'Chief Financial Officer',
  finance_director: 'Finance Director',
};

const orgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(120),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters').max(100),
  establishmentCapacity: z.nativeEnum(OrganizationInputEstablishmentCapacity, {
    required_error: 'Please select your establishment capacity',
  }),
  eligibilityAttested: z.boolean().refine((value) => value, {
    message: 'Confirm that you are eligible to establish this organization',
  }),
});

type OrgValues = z.infer<typeof orgSchema>;

export default function NewOrganization() {
  const router = useRouter();
  const createOrg = useCreateOrganization();

  const form = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: '',
      jobTitle: '',
      establishmentCapacity: undefined,
      eligibilityAttested: false,
    },
  });

  const isPending = form.formState.isSubmitting;

  const onSubmit = async (values: OrgValues) => {
    try {
      const org = await createOrg.mutateAsync({
        data: { ...values, eligibilityAttested: true },
      });
      toast.success('Organization established successfully');
      router.push(`/organizations/${org.id}`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to establish organization',
      );
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-3xl animate-in fade-in duration-500">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to organizations
          </Link>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Establish Organization</h1>
          <p className="text-muted-foreground mt-2 text-balance max-w-2xl">
            Create an organization workspace for your team. This does not verify
            your identity or the organization. Only eligible founders and finance
            leaders may establish an organization.
          </p>
        </div>

        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="md:grid md:grid-cols-5 h-full">
            <div className="bg-secondary/30 p-6 md:p-8 md:col-span-2 border-b md:border-b-0 md:border-r border-border/60 flex flex-col justify-between">
              <div>
                <div className="bg-primary/5 w-12 h-12 rounded-full flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-serif font-medium mb-2">Clear responsibilities</h3>
                <p className="text-sm text-muted-foreground text-balance">
                  You become the initial Owner. Your job title remains separate
                  from your PROOF role, and ownership does not bypass tenant or
                  server authorization controls.
                </p>
              </div>
            </div>
            
            <div className="p-6 md:p-8 md:col-span-3">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          Organization name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Acme Corporation Ltd" {...field} />
                        </FormControl>
                        <FormDescription>
                          Use the name your team will recognize. PROOF does not
                          verify this organization in Slice 1.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eligibilityAttested"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3 rounded-lg border border-border/70 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-describedby="eligibility-description"
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel>
                            I confirm I hold the selected capacity
                          </FormLabel>
                          <FormDescription id="eligibility-description">
                            This is your attestation. PROOF does not verify your
                            identity or the organization in Slice 1.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          Your Job Title
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Founder & CEO" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="establishmentCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Establishment Capacity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your authority to establish" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(OrganizationInputEstablishmentCapacity).map((val) => (
                              <SelectItem key={val} value={val}>
                                {capacityLabels[val as OrganizationInputEstablishmentCapacity]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the capacity you will attest to below.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isPending} className="w-full md:w-auto">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Establish Organization
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
