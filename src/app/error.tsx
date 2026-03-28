"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <Button variant="brand" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
