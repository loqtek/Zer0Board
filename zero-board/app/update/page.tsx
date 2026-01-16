"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface ReleaseCheckResult {
  hasUpdate: boolean;
  latestVersion: string | null;
  currentVersion: string;
  release: {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
    body: string;
  } | null;
}

export default function UpdatePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery<ReleaseCheckResult>({
    queryKey: ["github-releases"],
    queryFn: async () => {
      const response = await fetch("/api/github/releases");
      if (!response.ok) {
        throw new Error("Failed to check for updates");
      }
      return response.json();
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Zero Board</h1>
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2">Update Instructions</h2>
          <p className="text-[var(--text-muted)]">
            Follow these instructions to update your Zero Board installation to the latest version.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-[var(--text-muted)]">Checking for updates...</p>
            </CardContent>
          </Card>
        ) : data?.hasUpdate && data.release ? (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Update Available</CardTitle>
                <CardDescription>
                  A new version is available: <strong>{data.latestVersion}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p>
                    <strong>Current Version:</strong> {data.currentVersion}
                  </p>
                  <p>
                    <strong>Latest Version:</strong> {data.latestVersion}
                  </p>
                  <p>
                    <strong>Released:</strong> {new Date(data.release.published_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.open(data.release!.html_url, "_blank")}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Release on GitHub
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Update Instructions</CardTitle>
                <CardDescription>
                  Choose your installation method below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-[var(--foreground)]">
                      Docker Compose (Recommended)
                    </h3>
                    <div className="bg-[var(--muted)] p-4 rounded-md font-mono text-sm overflow-x-auto border border-[var(--border)]">
                      <pre className="text-[var(--foreground)] whitespace-pre-wrap">
{`# 1. Navigate to your ZeroBoard directory
cd /path/to/Zer0Board

# 2. Pull the latest changes from GitHub
git pull origin main

# 3. Rebuild and restart containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Verify the update
docker-compose logs frontend`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-[var(--foreground)]">
                      Service Installation (Systemd)
                    </h3>
                    <div className="bg-[var(--muted)] p-4 rounded-md font-mono text-sm overflow-x-auto border border-[var(--border)]">
                      <pre className="text-[var(--foreground)] whitespace-pre-wrap">
{`# 1. Navigate to your ZeroBoard directory
cd /path/to/Zer0Board

# 2. Pull the latest changes from GitHub
git pull origin main

# 3. Stop the services
sudo systemctl stop zero-board-backend
sudo systemctl stop zero-board-frontend

# 4. Update backend dependencies (if needed)
cd backend
source venv/bin/activate  # or your virtual environment
pip install -r requirements.txt

# 5. Update frontend dependencies
cd ../zero-board
npm install

# 6. Rebuild frontend (if needed)
npm run build

# 7. Restart services
sudo systemctl start zero-board-backend
sudo systemctl start zero-board-frontend

# 8. Check service status
sudo systemctl status zero-board-backend
sudo systemctl status zero-board-frontend`}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Release Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-[var(--foreground)]"
                  dangerouslySetInnerHTML={{
                    __html: data.release.body
                      .replace(/\n/g, "<br />")
                      .replace(/### (.*?)(<br \/>|$)/g, "<h3>$1</h3>")
                      .replace(/## (.*?)(<br \/>|$)/g, "<h2>$1</h2>")
                      .replace(/## (.*?)(<br \/>|$)/g, "<h2>$1</h2>")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                  }}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-[var(--text-muted)] mb-4">
                {data?.currentVersion
                  ? `You are running the latest version (${data.currentVersion}).`
                  : "Unable to check for updates. Please try again later."}
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-muted)] mb-4">
              For detailed update instructions, see the{" "}
              <a
                href="https://github.com/loqtek/Zer0Board/blob/main/UPDATE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                UPDATE.md
              </a>{" "}
              file on GitHub.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                window.open("https://github.com/loqtek/Zer0Board/releases", "_blank")
              }
            >
              <Download className="h-4 w-4 mr-2" />
              View All Releases
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

