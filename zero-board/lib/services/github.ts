/**
 * GitHub releases service
 * Checks for new releases on GitHub
 */

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  prerelease: boolean;
}

export interface ReleaseCheckResult {
  hasUpdate: boolean;
  latestVersion: string | null;
  currentVersion: string;
  release: GitHubRelease | null;
}

const CURRENT_VERSION = "0.1.0";
const GITHUB_REPO = "loqtek/Zer0Board";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const cleanV1 = v1.replace(/^v/, "");
  const cleanV2 = v2.replace(/^v/, "");
  
  const parts1 = cleanV1.split(".").map(Number);
  const parts2 = cleanV2.split(".").map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

/**
 * Check for updates from GitHub releases
 */
export async function checkForUpdates(): Promise<ReleaseCheckResult> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      // Add cache control to avoid too frequent checks
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No releases found
        return {
          hasUpdate: false,
          latestVersion: null,
          currentVersion: CURRENT_VERSION,
          release: null,
        };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release: GitHubRelease = await response.json();
    
    // Compare versions
    const latestVersion = release.tag_name.replace(/^v/, "");
    const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0;

    return {
      hasUpdate,
      latestVersion: release.tag_name,
      currentVersion: CURRENT_VERSION,
      release: hasUpdate ? release : null,
    };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return {
      hasUpdate: false,
      latestVersion: null,
      currentVersion: CURRENT_VERSION,
      release: null,
    };
  }
}

