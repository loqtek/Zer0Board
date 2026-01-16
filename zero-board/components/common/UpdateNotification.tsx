"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

interface ReleaseCheckResult {
  hasUpdate: boolean;
  latestVersion: string | null;
  currentVersion: string;
  release: {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
  } | null;
}

export function UpdateNotification() {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  const { data, isLoading } = useQuery<ReleaseCheckResult>({
    queryKey: ["github-releases"],
    queryFn: async () => {
      const response = await fetch("/api/github/releases");
      if (!response.ok) {
        throw new Error("Failed to check for updates");
      }
      return response.json();
    },
    refetchInterval: 3600000, // Check every hour
    staleTime: 3600000, // Consider data stale after 1 hour
  });

  // Check if user has dismissed this version
  useEffect(() => {
    if (data?.latestVersion) {
      const dismissedVersion = localStorage.getItem("dismissed-update-version");
      if (dismissedVersion === data.latestVersion) {
        setIsDismissed(true);
      }
    }
  }, [data?.latestVersion]);

  const handleDismiss = () => {
    if (data?.latestVersion) {
      localStorage.setItem("dismissed-update-version", data.latestVersion);
      setIsDismissed(true);
    }
  };

  const handleClick = () => {
    router.push("/update");
  };

  if (isLoading || !data?.hasUpdate || isDismissed) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="relative bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
      >
        <Bell className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Update Available</span>
        <span className="sm:hidden">Update</span>
        {data.latestVersion && (
          <span className="ml-2 text-xs font-semibold">{data.latestVersion}</span>
        )}
        <span
          className="ml-2 text-xs cursor-pointer hover:text-blue-900 dark:hover:text-blue-100"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          title="Dismiss"
        >
          ×
        </span>
      </Button>
    </div>
  );
}

