/**
 * Summary Extraction Service
 * Extracts structured summaries from session messages using LLM or fallback
 */

import { randomUUID } from 'crypto';
import { IMessageRepository } from '../../domain/ports/repositories/message.repository.port.js';
import { IAgentSummaryRepository } from '../../domain/ports/repositories/agent-summary.repository.port.js';
import { IMemoryRepository } from '../../domain/ports/repositories/memory.repository.port.js';
import { ISettingsRepository } from '../repositories/sqlite-settings.repository.js';
import { ExtractedAgentSummary } from '../../domain/entities/agent-summary.entity.js';
import { CrossSessionMemory } from '../../domain/entities/memory.entity.js';
import { Message } from '../../domain/entities/message.entity.js';

interface ExtractedSummary {
  summary: string;
  keyDecisions: string[];
  filesModified: string[];
  learnings: Array<{
    category: 'pattern' | 'convention' | 'gotcha' | 'decision';
    summary: string;
    keywords: string[];
  }>;
}

export interface ExtractionResult {
  agentSummary?: ExtractedAgentSummary;
  memories: CrossSessionMemory[];
}

export class SummaryExtractionService {
  constructor(
    private messageRepo: IMessageRepository,
    private agentSummaryRepo: IAgentSummaryRepository,
    private memoryRepo: IMemoryRepository | null,
    private settingsRepo: ISettingsRepository
  ) {}

  async extractFromSession(
    sessionId: string,
    agentId: string | null,
    projectId: string
  ): Promise<ExtractionResult> {
    // Get recent messages
    const messages = await this.messageRepo.findBySessionId(sessionId);
    const recentMessages = messages.slice(-50);

    if (recentMessages.length < 3) {
      return { memories: [] }; // Not enough content
    }

    try {
      // Try LLM extraction
      const extracted = await this.extractWithLLM(recentMessages);
      return this.saveExtracted(sessionId, agentId, projectId, extracted);
    } catch (error) {
      console.warn('LLM extraction failed, using fallback:', error);
      // Fallback to structured extraction
      const extracted = this.extractStructured(recentMessages);
      return this.saveExtracted(sessionId, agentId, projectId, extracted);
    }
  }

  private async extractWithLLM(messages: Message[]): Promise<ExtractedSummary> {
    const settings = await this.settingsRepo.getGlobal();
    // Check for API keys: gemini > anthropic > openai
    const geminiKey = settings.apiKeys?.gemini ?? process.env.GEMINI_API_KEY ?? '';
    const anthropicKey = settings.apiKeys?.anthropic ?? '';
    const openaiKey = settings.apiKeys?.openai ?? '';

    const apiKey = geminiKey || anthropicKey || openaiKey;
    const provider = geminiKey ? 'gemini' : (anthropicKey ? 'anthropic' : 'openai');

    if (!apiKey) {
      throw new Error('No API key available for extraction (set GEMINI_API_KEY, anthropic, or openai)');
    }

    // Format messages for prompt
    const conversation = messages
      .map(m => `${m.role}: ${this.extractTextContent(m)}`)
      .join('\n\n')
      .slice(0, 10000); // Limit context size

    const prompt = `Analyze this AI coding session and extract:
1. A brief summary (1-2 sentences)
2. Key decisions made
3. Files that were modified
4. Important learnings (patterns, conventions, gotchas)

Conversation:
${conversation}

Respond in JSON format only, no markdown:
{
  "summary": "...",
  "keyDecisions": ["..."],
  "filesModified": ["..."],
  "learnings": [
    { "category": "pattern|convention|gotcha|decision", "summary": "...", "keywords": ["..."] }
  ]
}`;

    const response = await this.callLLM(prompt, apiKey, provider);

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonStr);
  }

  private extractStructured(messages: Message[]): ExtractedSummary {
    const filesModified = new Set<string>();
    const keyTerms: string[] = [];

    for (const msg of messages) {
      // Extract file paths from tool calls
      if (msg.toolName && ['Write', 'Edit'].includes(msg.toolName)) {
        const input = msg.toolInput as Record<string, unknown>;
        const path = input.file_path ?? input.path;
        if (typeof path === 'string') {
          filesModified.add(path);
        }
      }

      // Extract key terms from assistant messages
      if (msg.role === 'assistant') {
        const text = this.extractTextContent(msg);
        const terms = text.match(/\b(implement|fix|refactor|add|remove|update|create)\s+\w+/gi);
        if (terms) keyTerms.push(...terms.slice(0, 5));
      }
    }

    return {
      summary: `Session modified ${filesModified.size} files. ${keyTerms.slice(0, 3).join('. ')}.`,
      keyDecisions: keyTerms.slice(0, 5),
      filesModified: Array.from(filesModified),
      learnings: filesModified.size > 0
        ? [{
            category: 'pattern',
            summary: `Modified: ${Array.from(filesModified).slice(0, 5).join(', ')}`,
            keywords: Array.from(filesModified).map(f => f.split('/').pop() ?? f),
          }]
        : [],
    };
  }

  private async saveExtracted(
    sessionId: string,
    agentId: string | null,
    projectId: string,
    extracted: ExtractedSummary
  ): Promise<ExtractionResult> {
    const result: ExtractionResult = { memories: [] };

    // Save agent summary if agent is assigned
    if (agentId) {
      const agentSummary = new ExtractedAgentSummary(
        randomUUID(),
        agentId,
        sessionId,
        extracted.summary,
        extracted.keyDecisions,
        extracted.filesModified,
        extracted.summary.length,
        new Date(),
        new Date()
      );
      await this.agentSummaryRepo.save(agentSummary);
      result.agentSummary = agentSummary;
    }

    // Save learnings as cross-session memories (requires memoryRepo)
    if (this.memoryRepo) {
      for (const learning of extracted.learnings) {
        const memory: CrossSessionMemory = {
          id: `${Date.now()}-${randomUUID().slice(0, 8)}`,
          sessionId: sessionId.slice(0, 8),
          projectId,
          category: learning.category,
          summary: learning.summary,
          keywords: learning.keywords.join(', '),
          vector: [], // Generated by repository
          timestamp: new Date().toISOString(),
        };

        const saved = await this.memoryRepo.save(memory);
        result.memories.push(saved);
      }
    }

    return result;
  }

  private extractTextContent(message: Message): string {
    return message.blocks
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; content: string }).content)
      .join('\n')
      .slice(0, 2000);
  }

  private async callLLM(prompt: string, apiKey: string, provider: string): Promise<string> {
    if (provider === 'gemini') {
      // Gemini API (gemini-2.5-flash-lite)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      };
      return data.candidates[0].content.parts[0].text;
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2024-10-22',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
      return data.content[0].text;
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0].message.content;
    }
  }
}
