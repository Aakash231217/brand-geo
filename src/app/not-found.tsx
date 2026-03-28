import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <FileQuestion className="h-8 w-8 text-zinc-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Page Not Found</h2>
      <p className="max-w-md text-center text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/">
        <Button variant="brand">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
