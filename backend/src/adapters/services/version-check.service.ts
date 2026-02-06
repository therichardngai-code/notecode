/**
 * Version Check Service
 * Dual-source version checking: npm registry (CLI) + GitHub Releases (Electron)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Deployment mode: npm (CLI/npx users) or electron (desktop app) */
export type DeploymentMode = 'npm' | 'electron';

/** GitHub release asset info */
interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

/** Version check result with deployment-aware fields */
export interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  deploymentMode: DeploymentMode;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;   // Platform-specific download (Electron only)
  downloadSize?: number;  // Asset size in bytes (Electron only)
  checkFailed?: boolean;  // True when version fetch failed
  checkError?: string;    // Error description when checkFailed
}

export class VersionCheckService {
  private static readonly NPM_REGISTRY = 'https://registry.npmjs.org/notecode-app';
  private static readonly GITHUB_OWNER = 'therichardngai-code';
  private static readonly GITHUB_REPO = 'notecode';
  private static readonly GITHUB_API =
    `https://api.github.com/repos/${VersionCheckService.GITHUB_OWNER}/${VersionCheckService.GITHUB_REPO}/releases/latest`;
  private static readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /** Separate caches for npm and GitHub sources */
  private cache: Record<DeploymentMode, { info: VersionInfo | null; lastCheck: number }> = {
    npm: { info: null, lastCheck: 0 },
    electron: { info: null, lastCheck: 0 },
  };

  /** Detect deployment mode — Electron sets IS_ELECTRON=true in main.ts */
  getDeploymentMode(): DeploymentMode {
    return process.env.IS_ELECTRON === 'true' ? 'electron' : 'npm';
  }

  /** Check for updates (cached 24h per deployment mode) */
  async checkForUpdates(forceRefresh = false): Promise<VersionInfo> {
    const mode = this.getDeploymentMode();
    const now = Date.now();
    const modeCache = this.cache[mode];

    // Return cached if within interval and not forced
    if (!forceRefresh && modeCache.info && (now - modeCache.lastCheck) < VersionCheckService.CHECK_INTERVAL_MS) {
      return modeCache.info;
    }

    const current = this.getCurrentVersion();

    try {
      const info = mode === 'electron'
        ? await this.checkGitHub(current, mode)
        : await this.checkNpm(current, mode);

      this.cache[mode] = { info, lastCheck: now };
      return info;
    } catch (error) {
      console.warn(`[VersionCheck] Failed to check ${mode} updates:`, error);
      return {
        current,
        latest: current,
        hasUpdate: false,
        deploymentMode: mode,
        checkFailed: true,
        checkError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Get current version from package.json (resolves relative to this file, not cwd) */
  getCurrentVersion(): string {
    if (process.env.npm_package_version) {
      return process.env.npm_package_version;
    }

    // Try backend/package.json first (relative to this compiled file)
    const searchPaths = [
      path.resolve(fileURLToPath(import.meta.url), '../../../..', 'package.json'), // backend/package.json
      path.resolve(fileURLToPath(import.meta.url), '../../../../..', 'package.json'), // root/package.json
      path.join(process.cwd(), 'package.json'), // fallback: cwd
    ];

    for (const pkgPath of searchPaths) {
      try {
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.version) return pkg.version;
        }
      } catch {
        // Try next path
      }
    }

    return '0.0.0';
  }

  /** Get update instructions based on deployment mode */
  getUpdateInstructions(version?: string): {
    npx: string;
    npmUpdate: string;
    npmInstall: string;
    electron: string;
    deploymentMode: DeploymentMode;
    recommended: string;
  } {
    const ver = version ?? 'latest';
    const mode = this.getDeploymentMode();
    const releaseTag = ver === 'latest' ? 'latest' : `v${ver}`;
    const githubUrl = `https://github.com/${VersionCheckService.GITHUB_OWNER}/${VersionCheckService.GITHUB_REPO}/releases/${releaseTag}`;

    return {
      npx: 'npx notecode-app@latest',
      npmUpdate: 'npm update -g notecode-app',
      npmInstall: `npm install -g notecode-app@${ver}`,
      electron: githubUrl,
      deploymentMode: mode,
      recommended: mode === 'electron' ? 'electron' : 'npx',
    };
  }

  // ── Private: npm source ──────────────────────────────────────────

  /** Fetch latest version from npm registry */
  private async checkNpm(current: string, mode: DeploymentMode): Promise<VersionInfo> {
    const response = await fetch(VersionCheckService.NPM_REGISTRY, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`npm registry: ${response.statusText}`);
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
      current,
      latest,
      hasUpdate: this.isNewerVersion(latest, current),
      deploymentMode: mode,
      releaseNotes: versionData?.releaseNotes ?? data.readme?.slice(0, 500),
      publishedAt: data.time[latest],
    };
  }

  // ── Private: GitHub source ───────────────────────────────────────

  /** Fetch latest release from GitHub Releases API */
  private async checkGitHub(current: string, mode: DeploymentMode): Promise<VersionInfo> {
    const response = await fetch(VersionCheckService.GITHUB_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'notecode-updater',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API: ${response.status} ${response.statusText}`);
    }

    const release = await response.json() as {
      tag_name: string;
      body?: string;
      published_at?: string;
      assets: Array<{ name: string; browser_download_url: string; size: number }>;
    };

    const version = release.tag_name.replace(/^v/, '');
    const assets: ReleaseAsset[] = release.assets.map(a => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
    }));
    const platformAsset = this.getAssetForPlatform(assets);

    return {
      current,
      latest: version,
      hasUpdate: this.isNewerVersion(version, current),
      deploymentMode: mode,
      releaseNotes: release.body,
      publishedAt: release.published_at,
      downloadUrl: platformAsset?.url,
      downloadSize: platformAsset?.size,
    };
  }

  /** Match release asset to current platform + architecture */
  private getAssetForPlatform(assets: ReleaseAsset[]): ReleaseAsset | undefined {
    const key = `${process.platform}-${process.arch}`;
    const patterns: Record<string, RegExp> = {
      'win32-x64': /win.*x64.*\.(exe|nsis)/i,
      'win32-ia32': /win.*(ia32|x86).*\.(exe|nsis)/i,
      'darwin-x64': /mac.*x64.*\.(dmg|zip)/i,
      'darwin-arm64': /mac.*arm64.*\.(dmg|zip)/i,
      'linux-x64': /linux.*x64.*\.(AppImage|deb)/i,
      'linux-arm64': /linux.*arm64.*\.(AppImage|deb)/i,
    };

    const pattern = patterns[key];
    return pattern ? assets.find(a => pattern.test(a.name)) : undefined;
  }

  // ── Private: Semver comparison ───────────────────────────────────

  /** Compare semantic versions (handles pre-release tags like 1.2.3-beta.1) */
  private isNewerVersion(latest: string, current: string): boolean {
    const clean = (v: string) => v.replace(/-.*$/, '');
    const [lM, lm, lp] = clean(latest).split('.').map(Number);
    const [cM, cm, cp] = clean(current).split('.').map(Number);

    if (lM !== cM) return lM > cM;
    if (lm !== cm) return lm > cm;
    return lp > cp;
  }
}
