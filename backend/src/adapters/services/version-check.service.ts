/**
 * Version Check Service
 * Checks npm registry for available updates
 */

import fs from 'fs';
import path from 'path';

export interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  releaseNotes?: string;
  publishedAt?: string;
}

export class VersionCheckService {
  private static readonly NPM_REGISTRY = 'https://registry.npmjs.org/notecode';
  private static readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  private cachedInfo: VersionInfo | null = null;
  private lastCheckTime: number = 0;

  /**
   * Check for updates (cached for 24 hours)
   */
  async checkForUpdates(forceRefresh = false): Promise<VersionInfo> {
    const now = Date.now();

    // Return cached if within interval and not forced
    if (!forceRefresh && this.cachedInfo && (now - this.lastCheckTime) < VersionCheckService.CHECK_INTERVAL_MS) {
      return this.cachedInfo;
    }

    const current = this.getCurrentVersion();

    try {
      const latest = await this.fetchLatestVersion();

      const info: VersionInfo = {
        current,
        latest: latest.version,
        hasUpdate: this.isNewerVersion(latest.version, current),
        releaseNotes: latest.releaseNotes,
        publishedAt: latest.publishedAt,
      };

      this.cachedInfo = info;
      this.lastCheckTime = now;

      return info;
    } catch (error) {
      console.warn('[VersionCheck] Failed to check for updates:', error);
      return {
        current,
        latest: current,
        hasUpdate: false,
      };
    }
  }

  /**
   * Get current version from package.json
   */
  getCurrentVersion(): string {
    // Try npm_package_version (set when running via npm/npx)
    if (process.env.npm_package_version) {
      return process.env.npm_package_version;
    }

    // Try reading package.json
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) return pkg.version;
      }
    } catch {
      // Ignore
    }

    return '0.1.0';
  }

  /**
   * Fetch latest version from npm registry
   */
  private async fetchLatestVersion(): Promise<{
    version: string;
    releaseNotes?: string;
    publishedAt?: string;
  }> {
    const response = await fetch(VersionCheckService.NPM_REGISTRY, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.statusText}`);
    }

    const data = await response.json() as {
      'dist-tags': { latest: string };
      versions: Record<string, { releaseNotes?: string }>;
      time: Record<string, string>;
      readme?: string;
    };

    const latest = data['dist-tags'].latest;
    const versionData = data.versions[latest];

    return {
      version: latest,
      releaseNotes: versionData?.releaseNotes ?? data.readme?.slice(0, 500),
      publishedAt: data.time[latest],
    };
  }

  /**
   * Compare semantic versions
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const [latestMajor, latestMinor, latestPatch] = latest.split('.').map(Number);
    const [currMajor, currMinor, currPatch] = current.split('.').map(Number);

    if (latestMajor !== currMajor) return latestMajor > currMajor;
    if (latestMinor !== currMinor) return latestMinor > currMinor;
    return latestPatch > currPatch;
  }

  /**
   * Get update instructions
   */
  getUpdateInstructions(version?: string): {
    npx: string;
    npmUpdate: string;
    npmInstall: string;
    electron: string;
  } {
    const ver = version ?? 'latest';
    return {
      npx: 'npx notecode@latest',
      npmUpdate: 'npm update -g notecode',
      npmInstall: `npm install -g notecode@${ver}`,
      electron: `https://github.com/org/notecode/releases/${ver === 'latest' ? 'latest' : `v${ver}`}`,
    };
  }
}
