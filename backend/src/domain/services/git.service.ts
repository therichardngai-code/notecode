/**
 * Git Service
 * Handles git operations: branch management, status, commit, diff
 */

import { exec } from 'child_process';
import { promisify } from 'util';

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
   */
  async getCurrentBranch(workingDir: string): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workingDir });
    return stdout.trim();
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
   * Check if there are any changes to commit
   */
  async hasChanges(workingDir: string): Promise<boolean> {
    const status = await this.getStatus(workingDir);
    return !status.isClean;
  }
}
