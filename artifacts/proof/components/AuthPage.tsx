"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

type AuthValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isPending = form.formState.isSubmitting;

  const onSubmit = async (values: AuthValues) => {
    try {
      if (isSignUp) {
        const result = await signUp(values);
        if (result.authenticated) {
          toast.success('Account created successfully');
          router.push('/');
        } else {
          toast.error(result.message || 'Failed to create account');
        }
      } else {
        const result = await signIn(values);
        if (result.authenticated) {
          toast.success('Signed in successfully');
          router.push('/');
        } else {
          toast.error(result.message || 'Invalid email or password');
        }
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred',
      );
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-serif text-foreground tracking-tight">
            {isSignUp ? 'Create your account' : 'Sign in to PROOF'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSignUp
              ? 'Create an account for the PROOF foundation.'
              : 'Enter your credentials to access your organizations.'}
          </p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@company.com"
                          type="email"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isSignUp ? 'At least 12 characters' : 'Enter your password'}
                          type="password"
                          autoComplete={isSignUp ? 'new-password' : 'current-password'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full font-medium"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              form.reset();
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
