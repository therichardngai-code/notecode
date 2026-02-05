/**
 * Discovery Service
 * Discovers available skills and agents from project and user folders.
 * Supports multiple CLI providers: Claude (.claude), Gemini (.gemini), Codex (.codex)
 * Falls back to universal .notecode folder for cross-provider compatibility.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { ProviderType } from '../value-objects/task-status.vo.js';

// Provider folder type - which config folder the skill/agent came from
export type ProviderFolder = 'claude' | 'gemini' | 'codex' | 'notecode';

export interface DiscoveredSkill {
  name: string;
  description: string;
  source: 'project' | 'user';
  path: string;
  providerFolder: ProviderFolder;
}

export interface DiscoveredAgent {
  name: string;
  description: string;
  model?: string;
  source: 'project' | 'user';
  path: string;
  providerFolder: ProviderFolder;
}

interface SearchPath {
  dir: string;
  source: 'project' | 'user';
  providerFolder: ProviderFolder;
}

export class DiscoveryService {
  /**
   * Discover all available skills from project and user folders
   * Priority: provider-specific (project) > .notecode (project) > provider-specific (user) > .notecode (user)
   */
  discoverSkills(projectPath: string, provider: ProviderType): DiscoveredSkill[] {
    const providerFolder = this.getProviderFolder(provider);
    const providerName = providerFolder.slice(1) as ProviderFolder; // Remove leading dot
    const home = homedir();
    const skills = new Map<string, DiscoveredSkill>();

    // Priority order (first match wins for same skill name)
    const searchPaths: SearchPath[] = [
      { dir: join(projectPath, providerFolder, 'skills'), source: 'project', providerFolder: providerName },
      { dir: join(projectPath, '.notecode', 'skills'), source: 'project', providerFolder: 'notecode' },
      { dir: join(home, providerFolder, 'skills'), source: 'user', providerFolder: providerName },
      { dir: join(home, '.notecode', 'skills'), source: 'user', providerFolder: 'notecode' },
    ];

    for (const { dir, source, providerFolder: pf } of searchPaths) {
      if (!existsSync(dir)) continue;

      try {
        const entries = readdirSync(dir);
        for (const skillName of entries) {
          try {
          const skillDir = join(dir, skillName);
          if (!statSync(skillDir).isDirectory()) continue;
          if (skills.has(skillName)) continue;

          const skillFile = join(skillDir, 'SKILL.md');
          if (!existsSync(skillFile)) continue;

          const parsed = this.parseSkillFile(skillFile);
          if (parsed) {
            const relativePath = source === 'project'
              ? `${pf === 'notecode' ? '.notecode' : providerFolder}/skills/${skillName}/SKILL.md`
              : `~/${pf === 'notecode' ? '.notecode' : providerFolder}/skills/${skillName}/SKILL.md`;

            skills.set(skillName, {
              name: skillName,
              description: parsed.description,
              source,
              path: relativePath,
              providerFolder: pf,
            });
          }
        } catch {
            continue; // Skip bad entry
          }
        }
      } catch {
        // Skip dir with read errors
      }
    }

    return Array.from(skills.values());
  }

  /**
   * Discover all available agents from project and user folders
   * Priority: provider-specific (project) > .notecode (project) > provider-specific (user) > .notecode (user)
   */
  discoverAgents(projectPath: string, provider: ProviderType): DiscoveredAgent[] {
    const providerFolder = this.getProviderFolder(provider);
    const providerName = providerFolder.slice(1) as ProviderFolder;
    const home = homedir();
    const agents = new Map<string, DiscoveredAgent>();

    const searchPaths: SearchPath[] = [
      { dir: join(projectPath, providerFolder, 'agents'), source: 'project', providerFolder: providerName },
      { dir: join(projectPath, '.notecode', 'agents'), source: 'project', providerFolder: 'notecode' },
      { dir: join(home, providerFolder, 'agents'), source: 'user', providerFolder: providerName },
      { dir: join(home, '.notecode', 'agents'), source: 'user', providerFolder: 'notecode' },
    ];

    for (const { dir, source, providerFolder: pf } of searchPaths) {
      if (!existsSync(dir)) continue;

      try {
        const files = readdirSync(dir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const agentName = basename(file, '.md');
          if (agents.has(agentName)) continue; // Higher priority already found

          const filePath = join(dir, file);
          const parsed = this.parseAgentFile(filePath);
          if (parsed) {
            const relativePath = source === 'project'
              ? `${pf === 'notecode' ? '.notecode' : providerFolder}/agents/${file}`
              : `~/${pf === 'notecode' ? '.notecode' : providerFolder}/agents/${file}`;

            agents.set(agentName, {
              name: agentName,
              description: parsed.description,
              model: parsed.model,
              source,
              path: relativePath,
              providerFolder: pf,
            });
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return Array.from(agents.values());
  }

  /**
   * Parse SKILL.md file and extract frontmatter metadata
   */
  private parseSkillFile(filePath: string): { description: string } | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
      if (!frontmatterMatch) return null;

      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/description:\s*(.+)/);

      return descMatch ? { description: descMatch[1].trim() } : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse agent markdown file and extract frontmatter metadata
   */
  private parseAgentFile(filePath: string): { description: string; model?: string } | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
      if (!frontmatterMatch) return null;

      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      const modelMatch = frontmatter.match(/model:\s*(.+)/);

      if (!descMatch) return null;

      return {
        description: descMatch[1].trim(),
        model: modelMatch?.[1].trim(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Map provider type to config folder name
   */
  private getProviderFolder(provider: ProviderType): string {
    const folders: Record<ProviderType, string> = {
      [ProviderType.ANTHROPIC]: '.claude',
      [ProviderType.GOOGLE]: '.gemini',
      [ProviderType.OPENAI]: '.codex',
    };
    return folders[provider] ?? '.notecode';
  }
}
