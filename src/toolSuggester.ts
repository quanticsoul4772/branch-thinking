/**
 * Tool Suggester for Branch-Thinking
 * 
 * Analyzes branch content and suggests relevant tools from the registry
 */

import { ThoughtBranch, ThoughtData } from './types.js';
import { toolRegistry, toolCategories, contextualRecommendations, ToolInfo } from './toolRegistry.js';
import { getConfig } from './config.js';

export interface ToolSuggestion {
  tool: string;
  domain: string;
  description: string;
  relevanceScore: number;
  reasons: string[];
}

interface BranchContext {
  keywords: Set<string>;
  fullContent: string;
  thoughtTypes: string[];
  branch: ThoughtBranch;
}

/**
 * Helper class for keyword extraction and analysis
 */
class ContentAnalyzer {
  private stopWords: Set<string>;

  constructor() {
    this.stopWords = getConfig().text.stopwords;
  }

  extractBranchContent(branch: ThoughtBranch): string {
    const thoughtContents = this.extractThoughtContents(branch.thoughts);
    const insightContents = branch.insights.map(i => i.content);
    
    return [...thoughtContents, ...insightContents]
      .join(' ')
      .toLowerCase();
  }

  private extractThoughtContents(thoughts: ThoughtData[]): string[] {
    return thoughts.map(t => {
      const keyPoints = t.metadata.keyPoints.join(' ');
      return `${t.content} ${keyPoints} ${t.metadata.type}`;
    });
  }

  extractKeywords(content: string): Set<string> {
    const words = content
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/gi, ''))
      .filter(w => w.length > 2 && !this.stopWords.has(w));
    
    return new Set(words);
  }
}

/**
 * Helper class for calculating tool relevance scores
 */
class RelevanceScorer {
  private static readonly TYPE_ALIGNMENTS: Record<string, string[]> = {
    'analysis': ['analyze_code', 'sequentialthinking', 'search_nodes'],
    'hypothesis': ['logic-thinking', 'web_search', 'search_nodes'],
    'implementation': ['write_file', 'fix_code', 'generate_docs'],
    'validation': ['logic-thinking', 'analyze_code', 'run_command'],
    'research': ['web_search', 'search_nodes', 'read_file'],
    'debugging': ['analyze_code', 'search_files', 'read_file'],
    'solution': ['fix_code', 'write_file', 'generate_docs']
  };

  calculateScore(tool: ToolInfo, context: BranchContext): number {
    const keywordScore = this.calculateKeywordScore(tool, context.keywords);
    const patternScore = this.calculatePatternScore(tool, context.fullContent);
    const typeScore = this.calculateTypeScore(tool, context.thoughtTypes);
    const stateScore = this.calculateStateScore(tool, context.branch);
    
    return Math.min(
      keywordScore * 0.4 + 
      patternScore * 0.3 + 
      typeScore * 0.2 + 
      stateScore * 0.1,
      1.0
    );
  }

  private calculateKeywordScore(tool: ToolInfo, keywords: Set<string>): number {
    if (tool.keywords.length === 0) return 0;
    
    const matches = tool.keywords.filter(kw => keywords.has(kw)).length;
    return matches / tool.keywords.length;
  }

  private calculatePatternScore(tool: ToolInfo, content: string): number {
    if (tool.patterns.length === 0) return 0;
    
    const matches = tool.patterns.filter(p => p.test(content)).length;
    return matches / tool.patterns.length;
  }

  private calculateTypeScore(tool: ToolInfo, thoughtTypes: string[]): number {
    if (thoughtTypes.length === 0) return 0;
    
    let alignmentCount = 0;
    for (const type of thoughtTypes) {
      const alignedTools = RelevanceScorer.TYPE_ALIGNMENTS[type] || [];
      if (alignedTools.includes(tool.name)) {
        alignmentCount++;
      }
    }
    
    return alignmentCount / thoughtTypes.length;
  }

  private calculateStateScore(tool: ToolInfo, branch: ThoughtBranch): number {
    if (branch.state === 'active' && branch.confidence < 0.5) {
      if (tool.domain === 'reasoning' || tool.name.includes('analyze')) {
        return 1.0;
      }
    }
    return 0;
  }

  static getAlignedTypes(toolName: string, thoughtTypes: string[]): string[] {
    return thoughtTypes.filter(type => {
      const alignedTools = RelevanceScorer.TYPE_ALIGNMENTS[type] || [];
      return alignedTools.includes(toolName);
    });
  }
}

/**
 * Helper class for generating suggestion reasons
 */
class ReasonGenerator {
  static generate(tool: ToolInfo, context: BranchContext): string[] {
    const reasons: string[] = [];
    
    this.addKeywordReasons(reasons, tool, context.keywords);
    this.addPatternReasons(reasons, tool, context.fullContent);
    this.addTypeReasons(reasons, tool, context.thoughtTypes);
    
    return reasons;
  }

  private static addKeywordReasons(reasons: string[], tool: ToolInfo, keywords: Set<string>): void {
    const matchedKeywords = tool.keywords.filter(kw => keywords.has(kw));
    if (matchedKeywords.length > 0) {
      reasons.push(`Keywords match: ${matchedKeywords.join(', ')}`);
    }
  }

  private static addPatternReasons(reasons: string[], tool: ToolInfo, content: string): void {
    for (const pattern of tool.patterns) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        if (match) {
          reasons.push(`Pattern detected: "${match[0]}"`);
        }
      }
    }
  }

  private static addTypeReasons(reasons: string[], tool: ToolInfo, thoughtTypes: string[]): void {
    const alignedTypes = RelevanceScorer.getAlignedTypes(tool.name, thoughtTypes);
    if (alignedTypes.length > 0) {
      reasons.push(`Aligns with ${alignedTypes.join(', ')} thoughts`);
    }
  }
}

export class ToolSuggester {
  private contentAnalyzer: ContentAnalyzer;
  private relevanceScorer: RelevanceScorer;

  constructor() {
    this.contentAnalyzer = new ContentAnalyzer();
    this.relevanceScorer = new RelevanceScorer();
  }

  /**
   * Suggest tools based on branch content
   */
  suggestTools(branch: ThoughtBranch, maxSuggestions: number = 5): ToolSuggestion[] {
    const context = this.analyzeBranch(branch);
    const suggestions = this.gatherSuggestions(context);
    this.addContextualSuggestions(suggestions, context);
    
    return this.rankAndSelect(suggestions, maxSuggestions);
  }

  private analyzeBranch(branch: ThoughtBranch): BranchContext {
    const fullContent = this.contentAnalyzer.extractBranchContent(branch);
    const keywords = this.contentAnalyzer.extractKeywords(fullContent);
    const thoughtTypes = branch.thoughts.map(t => t.metadata.type);
    
    return { keywords, fullContent, thoughtTypes, branch };
  }

  private gatherSuggestions(context: BranchContext): Map<string, ToolSuggestion> {
    const suggestions = new Map<string, ToolSuggestion>();
    
    for (const [toolName, toolInfo] of Object.entries(toolRegistry)) {
      const score = this.relevanceScorer.calculateScore(toolInfo, context);
      
      if (score > 0.1) {
        const reasons = ReasonGenerator.generate(toolInfo, context);
        suggestions.set(toolName, {
          tool: toolName,
          domain: toolInfo.domain,
          description: toolInfo.description,
          relevanceScore: score,
          reasons
        });
      }
    }
    
    return suggestions;
  }

  private addContextualSuggestions(
    suggestions: Map<string, ToolSuggestion>,
    context: BranchContext
  ): void {
    for (const [contextKey, tools] of Object.entries(contextualRecommendations)) {
      if (this.matchesContext(contextKey, context)) {
        this.addContextTools(suggestions, tools, contextKey);
      }
    }
  }

  private matchesContext(contextKey: string, context: BranchContext): boolean {
    return context.thoughtTypes.includes(contextKey) || 
           context.keywords.has(contextKey);
  }

  private addContextTools(
    suggestions: Map<string, ToolSuggestion>,
    tools: string[],
    contextKey: string
  ): void {
    for (const toolName of tools) {
      const toolInfo = toolRegistry[toolName];
      if (!toolInfo) continue;

      if (suggestions.has(toolName)) {
        this.boostExistingSuggestion(suggestions.get(toolName)!, contextKey);
      } else {
        this.addNewContextualSuggestion(suggestions, toolName, toolInfo, contextKey);
      }
    }
  }

  private boostExistingSuggestion(suggestion: ToolSuggestion, contextKey: string): void {
    suggestion.relevanceScore += 0.2;
    suggestion.reasons.push(`Recommended for ${contextKey} context`);
  }

  private addNewContextualSuggestion(
    suggestions: Map<string, ToolSuggestion>,
    toolName: string,
    toolInfo: ToolInfo,
    contextKey: string
  ): void {
    suggestions.set(toolName, {
      tool: toolName,
      domain: toolInfo.domain,
      description: toolInfo.description,
      relevanceScore: 0.3,
      reasons: [`Recommended for ${contextKey} context`]
    });
  }

  private rankAndSelect(
    suggestions: Map<string, ToolSuggestion>,
    maxSuggestions: number
  ): ToolSuggestion[] {
    return Array.from(suggestions.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxSuggestions);
  }

  /**
   * Get tools by domain
   */
  getToolsByDomain(domain: string): ToolInfo[] {
    return Object.values(toolRegistry).filter(tool => tool.domain === domain);
  }

  /**
   * Get all available domains
   */
  getAvailableDomains(): string[] {
    return Object.keys(toolCategories);
  }
}
