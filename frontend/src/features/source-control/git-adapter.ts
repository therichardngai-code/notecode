export interface GitStatus {
  branch: string;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
}

export interface GitFileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  diff?: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
}

export class BrowserGitAdapter {
  private currentBranch = 'main';
  private mockStaged: GitFileChange[] = [];
  private mockUnstaged: GitFileChange[] = [
    { path: 'src/index.ts', status: 'modified', diff: '+ console.log("test");' },
    { path: 'README.md', status: 'modified', diff: '+ ## New section' },
  ];
  private mockUntracked: string[] = ['temp.txt'];
  private mockBranches: GitBranch[] = [
    { name: 'main', current: true },
    { name: 'feature/new-feature', current: false },
    { name: 'bugfix/fix-issue', current: false },
  ];

  async getStatus(): Promise<GitStatus> {
    return {
      branch: this.currentBranch,
      staged: [...this.mockStaged],
      unstaged: [...this.mockUnstaged],
      untracked: [...this.mockUntracked],
    };
  }

  async getBranches(): Promise<GitBranch[]> {
    return this.mockBranches.map((b) => ({
      ...b,
      current: b.name === this.currentBranch,
    }));
  }

  async checkout(branch: string): Promise<void> {
    const branchExists = this.mockBranches.some((b) => b.name === branch);
    if (!branchExists) {
      throw new Error(`Branch not found: ${branch}`);
    }
    this.currentBranch = branch;
    this.mockBranches = this.mockBranches.map((b) => ({
      ...b,
      current: b.name === branch,
    }));
  }

  async stage(filePath: string): Promise<void> {
    const unstagedIndex = this.mockUnstaged.findIndex((f) => f.path === filePath);
    if (unstagedIndex !== -1) {
      const [file] = this.mockUnstaged.splice(unstagedIndex, 1);
      this.mockStaged.push(file);
      return;
    }

    const untrackedIndex = this.mockUntracked.indexOf(filePath);
    if (untrackedIndex !== -1) {
      this.mockUntracked.splice(untrackedIndex, 1);
      this.mockStaged.push({ path: filePath, status: 'added' });
    }
  }

  async unstage(filePath: string): Promise<void> {
    const stagedIndex = this.mockStaged.findIndex((f) => f.path === filePath);
    if (stagedIndex !== -1) {
      const [file] = this.mockStaged.splice(stagedIndex, 1);
      if (file.status === 'added') {
        this.mockUntracked.push(file.path);
      } else {
        this.mockUnstaged.push(file);
      }
    }
  }

  async commit(message: string): Promise<void> {
    if (this.mockStaged.length === 0) {
      throw new Error('No changes staged for commit');
    }
    if (!message.trim()) {
      throw new Error('Commit message cannot be empty');
    }
    console.log(`Committed ${this.mockStaged.length} files with message: "${message}"`);
    this.mockStaged = [];
  }

  async getDiff(filePath: string): Promise<string> {
    const file = [...this.mockStaged, ...this.mockUnstaged].find((f) => f.path === filePath);
    return file?.diff ?? 'No changes';
  }
}

export const gitAdapter = new BrowserGitAdapter();
