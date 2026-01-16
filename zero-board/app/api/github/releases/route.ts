import { NextResponse } from "next/server";
import { checkForUpdates } from "@/lib/services/github";

/**
 * API route to check for GitHub releases
 * This is a server-side route to avoid CORS issues
 */
export async function GET() {
  try {
    const result = await checkForUpdates();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GitHub releases API route:", error);
    return NextResponse.json(
      {
        hasUpdate: false,
        latestVersion: null,
        currentVersion: "0.1.0",
        release: null,
        error: "Failed to check for updates",
      },
      { status: 500 }
    );
  }
}

// Cache the response for 1 hour to avoid too frequent API calls
export const revalidate = 3600;

