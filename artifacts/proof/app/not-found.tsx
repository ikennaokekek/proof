import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[50vh]">
      <Card className="w-full max-w-md border-border/60 shadow-sm text-center">
        <CardContent className="pt-10 pb-8 flex flex-col items-center">
          <div className="bg-primary/5 p-4 rounded-full mb-4">
            <FileQuestion className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-medium tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-muted-foreground text-sm mb-6 text-balance">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
