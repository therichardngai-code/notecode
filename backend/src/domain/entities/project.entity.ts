/**
 * Project Entity
 * Represents a development project with its metadata
 */

export interface ApprovalGateConfig {
  enabled: boolean;
  rules?: Array<{
    pattern: string;
    action: 'approve' | 'deny' | 'ask';
  }>;
}

export class Project {
  constructor(
    public readonly id: string,
    public name: string,
    public path: string,
    public systemPrompt: string | null, // Per-project system prompt override
    public approvalGate: ApprovalGateConfig | null, // Per-project approval gate override
    public isFavorite: boolean,
    public lastAccessedAt: Date | null,
    public readonly createdAt: Date
  ) {}

  markAsFavorite(): void {
    this.isFavorite = true;
  }

  unmarkAsFavorite(): void {
    this.isFavorite = false;
  }

  recordAccess(): void {
    this.lastAccessedAt = new Date();
  }

  updateName(name: string): void {
    if (!name.trim()) {
      throw new Error('Project name cannot be empty');
    }
    this.name = name.trim();
  }

  updatePath(path: string): void {
    if (!path.trim()) {
      throw new Error('Project path cannot be empty');
    }
    this.path = path.trim();
  }

  updateSystemPrompt(prompt: string | null): void {
    this.systemPrompt = prompt?.trim() || null;
  }

  updateApprovalGate(config: ApprovalGateConfig | null): void {
    this.approvalGate = config;
  }
}
