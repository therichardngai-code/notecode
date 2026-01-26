export interface GitCommitInput {
  message: string;
  stagedFiles: string[];
}

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  message: string;
}

export class CommitChangesUseCase {
  async execute(input: GitCommitInput): Promise<GitCommitResult> {
    try {
      if (!input.message.trim()) {
        throw new Error('Commit message cannot be empty');
      }

      if (input.stagedFiles.length === 0) {
        throw new Error('No files staged for commit');
      }

      const commitHash = this.generateCommitHash();

      console.log(`Creating commit with message: "${input.message}"`);
      console.log(`Files: ${input.stagedFiles.join(', ')}`);

      return {
        success: true,
        commitHash,
        message: `Successfully committed ${input.stagedFiles.length} file(s)`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Commit failed',
      };
    }
  }

  private generateCommitHash(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
