/**
 * Git Service
 * Handles git operations: branch management, status, commit, diff
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// Default .gitignore template for new projects
const DEFAULT_GITIGNORE = `# Windows reserved filenames
nul
NUL
con
CON
prn
PRN
aux
AUX

# AI Agent configs
.claude/
.gemini/
.agent/
CLAUDE.md
AGENTS.md
GEMINI.md

# Temp
tmp/

# Dependencies
node_modules/
**/node_modules/
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.*
!.env.example

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`;

const execAsync = promisify(exec);

export interface GitStatus {
  currentBranch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface GitDiffSummary {
  files: number;
  additions: number;
  deletions: number;
}

export interface GitFileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitCommitInfo {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export class GitService {
  /**
   * Get current git status
   */
  async getStatus(workingDir: string): Promise<GitStatus> {
    const branch = await this.getCurrentBranch(workingDir);
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: workingDir });

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of statusOutput.split('\n').filter(Boolean)) {
      const indexStatus = line[0];
      const workStatus = line[1];
      const filePath = line.slice(3);

      if (indexStatus === '?') {
        untracked.push(filePath);
      } else {
        if (indexStatus !== ' ' && indexStatus !== '?') {
          staged.push(filePath);
        }
        if (workStatus !== ' ' && workStatus !== '?') {
          unstaged.push(filePath);
        }
      }
    }

    return {
      currentBranch: branch,
      isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0,
      staged,
      unstaged,
      untracked,
    };
  }

  /**
   * Get current branch name
   * Uses symbolic-ref for empty repos (no commits yet)
   */
  async getCurrentBranch(workingDir: string): Promise<string> {
    try {
      // Try symbolic-ref first (works for empty repos with no commits)
      const { stdout } = await execAsync('git symbolic-ref --short HEAD', { cwd: workingDir });
      return stdout.trim();
    } catch {
      // Fallback to rev-parse for detached HEAD state
      try {
        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workingDir });
        return stdout.trim();
      } catch {
        // Default to 'main' if all else fails
        return 'main';
      }
    }
  }

  /**
   * Create a new branch and switch to it
   */
  async createBranch(workingDir: string, branchName: string): Promise<void> {
    // Check if branch already exists
    const exists = await this.branchExists(workingDir, branchName);
    if (exists) {
      throw new Error(`Branch '${branchName}' already exists`);
    }

    await execAsync(`git checkout -b "${branchName}"`, { cwd: workingDir });
  }

  /**
   * Check if branch exists
   */
  async branchExists(workingDir: string, branchName: string): Promise<boolean> {
    try {
      await execAsync(`git rev-parse --verify "${branchName}"`, { cwd: workingDir });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Switch to existing branch
   */
  async checkoutBranch(workingDir: string, branchName: string): Promise<void> {
    await execAsync(`git checkout "${branchName}"`, { cwd: workingDir });
  }

  /**
   * Delete branch (force)
   */
  async deleteBranch(workingDir: string, branchName: string): Promise<void> {
    await execAsync(`git branch -D "${branchName}"`, { cwd: workingDir });
  }

  /**
   * Get diff summary (number of files, additions, deletions)
   */
  async getDiffSummary(workingDir: string): Promise<GitDiffSummary> {
    // Get stats for staged + unstaged changes
    const { stdout } = await execAsync('git diff --stat HEAD', { cwd: workingDir });

    let files = 0;
    let additions = 0;
    let deletions = 0;

    const lines = stdout.trim().split('\n');
    const summaryLine = lines[lines.length - 1];

    // Parse summary line: "3 files changed, 50 insertions(+), 10 deletions(-)"
    const filesMatch = summaryLine.match(/(\d+) files? changed/);
    const additionsMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
    const deletionsMatch = summaryLine.match(/(\d+) deletions?\(-\)/);

    if (filesMatch) files = parseInt(filesMatch[1], 10);
    if (additionsMatch) additions = parseInt(additionsMatch[1], 10);
    if (deletionsMatch) deletions = parseInt(deletionsMatch[1], 10);

    return { files, additions, deletions };
  }

  /**
   * Get list of changed files with their status
   */
  async getChangedFiles(workingDir: string): Promise<string[]> {
    const { stdout } = await execAsync('git diff --name-only HEAD', { cwd: workingDir });
    const tracked = stdout.trim().split('\n').filter(Boolean);

    // Also include untracked files
    const { stdout: untrackedOut } = await execAsync('git ls-files --others --exclude-standard', { cwd: workingDir });
    const untracked = untrackedOut.trim().split('\n').filter(Boolean);

    return [...new Set([...tracked, ...untracked])];
  }

  /**
   * Get file diffs with patches
   */
  async getFileDiffs(workingDir: string): Promise<GitFileDiff[]> {
    const { stdout } = await execAsync('git diff --numstat HEAD', { cwd: workingDir });
    const diffs: GitFileDiff[] = [];

    for (const line of stdout.trim().split('\n').filter(Boolean)) {
      const [add, del, path] = line.split('\t');
      const additions = add === '-' ? 0 : parseInt(add, 10);
      const deletions = del === '-' ? 0 : parseInt(del, 10);

      // Get patch for this file
      const { stdout: patch } = await execAsync(`git diff HEAD -- "${path}"`, { cwd: workingDir });

      diffs.push({
        path,
        status: 'modified', // Simplified - could detect add/delete from status
        additions,
        deletions,
        patch,
      });
    }

    return diffs;
  }

  /**
   * Stage all changes
   */
  async stageAll(workingDir: string): Promise<void> {
    await execAsync('git add -A', { cwd: workingDir });
  }

  /**
   * Commit changes with message
   */
  async commit(workingDir: string, message: string): Promise<string> {
    // Stage all changes first
    await this.stageAll(workingDir);

    // Commit
    await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: workingDir });

    // Get commit SHA
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workingDir });
    return stdout.trim();
  }

  /**
   * Discard all changes (dangerous!)
   */
  async discardChanges(workingDir: string): Promise<void> {
    await execAsync('git checkout .', { cwd: workingDir });
    await execAsync('git clean -fd', { cwd: workingDir });
  }

  /**
   * Get last commit info
   */
  async getLastCommit(workingDir: string): Promise<GitCommitInfo> {
    const { stdout } = await execAsync(
      'git log -1 --format="%H%n%s%n%an%n%aI"',
      { cwd: workingDir }
    );
    const [sha, message, author, dateStr] = stdout.trim().split('\n');

    return {
      sha,
      message,
      author,
      date: new Date(dateStr),
    };
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepo(workingDir: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: workingDir });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a new git repository
   */
  async initRepo(workingDir: string): Promise<void> {
    await execAsync('git init', { cwd: workingDir });
  }

  /**
   * Check if repository has any commits
   */
  async hasCommits(workingDir: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse HEAD', { cwd: workingDir });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create initial commit (for empty repos)
   * Creates .gitkeep if no files exist, then commits
   * Flow: Try global git config → fallback to settings → error with instructions
   */
  async createInitialCommit(
    workingDir: string,
    userConfig?: { name?: string; email?: string }
  ): Promise<void> {
    // Ensure .gitignore exists with default patterns (handles Windows reserved filenames)
    const gitignorePath = join(workingDir, '.gitignore');
    try {
      const existing = await readFile(gitignorePath, 'utf-8');
      // Append default patterns if 'nul' not already ignored
      if (!existing.includes('nul')) {
        await writeFile(gitignorePath, existing + '\n' + DEFAULT_GITIGNORE);
      }
    } catch {
      // .gitignore doesn't exist - create with default template
      await writeFile(gitignorePath, DEFAULT_GITIGNORE);
    }

    // Check if there are any files to commit
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: workingDir });

    if (!statusOutput.trim()) {
      // No files at all - create .gitkeep (cross-platform using Node.js)
      await writeFile(join(workingDir, '.gitkeep'), '');
    }

    // Stage all files
    await execAsync('git add -A', { cwd: workingDir });

    // Try commit with user's global git config first
    try {
      await execAsync('git commit -m "Initial commit"', { cwd: workingDir });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Check if error is due to missing git config
      if (errorMsg.includes('user.name') || errorMsg.includes('user.email') || errorMsg.includes('tell me who you are')) {
        // Try settings fallback if available
        if (userConfig?.name && userConfig?.email) {
          await execAsync(
            `git -c user.name="${userConfig.name}" -c user.email="${userConfig.email}" commit -m "Initial commit"`,
            { cwd: workingDir }
          );
        } else {
          // No fallback available - throw clear error
          throw new Error(
            'Git user not configured. Please set git config or update Settings with your name and email.\n' +
            'Run: git config --global user.name "Your Name"\n' +
            'Run: git config --global user.email "your@email.com"'
          );
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if there are any changes to commit
   */
  async hasChanges(workingDir: string): Promise<boolean> {
    const status = await this.getStatus(workingDir);
    return !status.isClean;
  }
}
