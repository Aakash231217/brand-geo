"use client";

import { useState, useEffect } from "react";
import { isConfigured } from "@/lib/brand-store";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function SetupBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isConfigured());
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Configure your brand to get real AI visibility data
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Go to Settings to set your brand name, keywords, and competitors. Then all dashboards will show live data from AI platforms.
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
        >
          Setup <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
