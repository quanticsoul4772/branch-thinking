/**
 * Tool Registry for Branch-Thinking Tool Suggestions
 * 
 * Subset of a2a registry with tools relevant for reasoning workflows
 */

export interface ToolInfo {
  name: string;
  domain: string;
  description: string;
  keywords: string[];
  patterns: RegExp[];
}

/**
 * Curated tool registry for branch-thinking suggestions
 */
export const toolRegistry: Record<string, ToolInfo> = {
  // Reasoning Domain
  sequentialthinking: {
    name: 'sequentialthinking',
    domain: 'reasoning',
    description: 'Step-by-step thinking for complex problems',
    keywords: ['step', 'sequential', 'systematic', 'thorough', 'detailed', 'analysis'],
    patterns: [/step.?by.?step/i, /break.*down/i, /systematic.*approach/i]
  },
  'logic-thinking': {
    name: 'logic-thinking',
    domain: 'reasoning', 
    description: 'Formal logical reasoning and validation',
    keywords: ['logic', 'validate', 'proof', 'formal', 'syllogism', 'predicate'],
    patterns: [/logical.*reasoning/i, /validate.*argument/i, /formal.*proof/i]
  },

  // Code Domain
  analyze_code: {
    name: 'analyze_code',
    domain: 'code',
    description: 'Analyze code for bugs, style, security, and performance',
    keywords: ['code', 'analyze', 'bug', 'security', 'performance', 'quality'],
    patterns: [/analyze.*code/i, /code.*review/i, /find.*bugs?/i, /security.*issue/i]
  },
  fix_code: {
    name: 'fix_code',
    domain: 'code',
    description: 'Automatically fix common code issues',
    keywords: ['fix', 'repair', 'correct', 'patch', 'resolve'],
    patterns: [/fix.*code/i, /repair.*issue/i, /correct.*error/i]
  },
  generate_docs: {
    name: 'generate_docs',
    domain: 'code',
    description: 'Generate documentation from source code',
    keywords: ['documentation', 'docs', 'api', 'comments', 'explain'],
    patterns: [/generate.*doc/i, /document.*code/i, /api.*documentation/i]
  },

  // Memory Domain
  search_nodes: {
    name: 'search_nodes',
    domain: 'memory',
    description: 'Search knowledge graph for relevant information',
    keywords: ['search', 'find', 'lookup', 'recall', 'memory', 'previous'],
    patterns: [/search.*memory/i, /find.*previous/i, /recall.*information/i]
  },
  create_entities: {
    name: 'create_entities',
    domain: 'memory',
    description: 'Store information in knowledge graph',
    keywords: ['save', 'store', 'remember', 'persist', 'record'],
    patterns: [/save.*for.*later/i, /store.*information/i, /remember.*this/i]
  },

  // System Domain
  read_file: {
    name: 'read_file',
    domain: 'system',
    description: 'Read file contents',
    keywords: ['read', 'file', 'open', 'load', 'contents'],
    patterns: [/read.*file/i, /open.*file/i, /load.*contents/i]
  },
  write_file: {
    name: 'write_file',
    domain: 'system',
    description: 'Write content to file',
    keywords: ['write', 'save', 'create', 'file', 'output'],
    patterns: [/write.*file/i, /save.*to.*file/i, /create.*file/i]
  },
  search_files: {
    name: 'search_files',
    domain: 'system',
    description: 'Search for files matching a pattern',
    keywords: ['search', 'find', 'locate', 'files', 'pattern'],
    patterns: [/search.*files?/i, /find.*files?/i, /locate.*in.*directory/i]
  },
  run_command: {
    name: 'run_command',
    domain: 'system',
    description: 'Execute shell commands',
    keywords: ['run', 'execute', 'command', 'shell', 'terminal'],
    patterns: [/run.*command/i, /execute.*shell/i, /terminal.*command/i]
  },

  // Research Domain
  web_search: {
    name: 'web_search',
    domain: 'research',
    description: 'Search the web for information',
    keywords: ['search', 'web', 'internet', 'google', 'research', 'find'],
    patterns: [/search.*web/i, /google.*search/i, /research.*online/i]
  },
  web_fetch: {
    name: 'web_fetch',
    domain: 'research',
    description: 'Fetch content from a URL',
    keywords: ['fetch', 'url', 'website', 'page', 'content'],
    patterns: [/fetch.*url/i, /get.*webpage/i, /read.*website/i]
  }
};

/**
 * Tool categories for grouping suggestions
 */
export const toolCategories = {
  reasoning: ['sequentialthinking', 'logic-thinking'],
  code: ['analyze_code', 'fix_code', 'generate_docs'],
  memory: ['search_nodes', 'create_entities'],
  system: ['read_file', 'write_file', 'search_files', 'run_command'],
  research: ['web_search', 'web_fetch']
};

/**
 * Context-based tool recommendations
 */
export const contextualRecommendations: Record<string, string[]> = {
  debugging: ['analyze_code', 'search_files', 'read_file', 'run_command'],
  documentation: ['generate_docs', 'read_file', 'write_file'],
  research: ['web_search', 'search_nodes', 'sequentialthinking'],
  validation: ['logic-thinking', 'analyze_code'],
  implementation: ['write_file', 'fix_code', 'generate_docs'],
  analysis: ['sequentialthinking', 'analyze_code', 'search_nodes']
};
