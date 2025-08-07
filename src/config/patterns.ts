/**
 * Centralized patterns configuration
 * All regex patterns and matchers used throughout the application
 */

export const PATTERNS = {
  contradiction: {
    // Patterns for detecting contradictions
    direct: [
      /(\w+)\s+is\s+(\w+).*but.*\1\s+is\s+not\s+\2/i,
      /(\w+)\s+is\s+not\s+(\w+).*but.*\1\s+is\s+\2/i,
      /(\w+)\s+cannot\s+be\s+(\w+).*but.*\1\s+is\s+\2/i
    ],
    temporal: [
      /first\s+.*\s+then\s+.*\s+but\s+.*\s+before/i,
      /after\s+.*\s+but\s+.*\s+before/i,
      /simultaneously\s+.*\s+but\s+.*\s+different\s+times/i
    ],
    logical: [
      /if\s+.*\s+then\s+.*\s+but\s+.*\s+not/i,
      /because\s+.*\s+therefore\s+.*\s+however\s+.*\s+not/i,
      /implies\s+.*\s+but\s+.*\s+contradicts/i
    ]
  },
  
  premise: {
    // Patterns for extracting premises and conclusions
    extraction: [
      /^(if|when|given|assuming|suppose)\s+(.+?)(?:,|\s+then)/i,
      /^(because|since|as)\s+(.+?)(?:,|\s+therefore)/i,
      /^(premise|assumption|hypothesis):\s*(.+)/i
    ],
    conclusion: [
      /(?:therefore|thus|hence|consequently|so)\s+(.+)/i,
      /(?:conclude|conclusion|result):\s*(.+)/i,
      /(?:it follows that|we can deduce that)\s+(.+)/i
    ]
  },
  
  tools: {
    // Patterns for tool matching
    fileSystem: /\b(read|write|create|delete|move|copy|list)\s+(file|directory|folder)\b/i,
    search: /\b(search|find|look for|query)\s+(in|through|within)\b/i,
    memory: /\b(remember|recall|store|save|retrieve)\s+(information|data|knowledge)\b/i,
    calculation: /\b(calculate|compute|solve|evaluate)\s+(expression|equation|formula)\b/i,
    web: /\b(browse|fetch|scrape|download)\s+(web|url|site|page)\b/i
  },
  
  text: {
    // Text processing patterns
    sentence: /[.!?]+\s+/g,
    word: /\b\w+\b/g,
    whitespace: /\s+/g,
    punctuation: /[^\w\s]/g,
    camelCase: /([a-z])([A-Z])/g,
    snakeCase: /_+/g,
    kebabCase: /-+/g
  },
  
  circularReasoning: {
    // Patterns for detecting circular reasoning components
    premises: [
      /(?:given|assuming|if|suppose|let's say|premise:)\s+([^,.]+)/g,
      /(?:based on|according to|from)\s+([^,.]+)/g,
      /(?:because|since|as)\s+([^,.]+)/g
    ],
    conclusions: [
      /(?:therefore|thus|hence|so|consequently)\s+([^,.]+)/g,
      /(?:this means|this shows|we can conclude)\s+([^,.]+)/g,
      /(?:proves|demonstrates|indicates)\s+([^,.]+)/g
    ],
    dependencies: [
      /(?:as shown in|see|refer to|from)\s+thought[- ]?(\w+)/g,
      /(?:building on|extending|following)\s+(\w+)/g
    ]
  },

  validation: {
    // Validation patterns
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    semver: /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  }
};

// Helper functions for pattern matching
export const PatternMatchers = {
  /**
   * Test if text matches any pattern in a group
   */
  matchesAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  },
  
  /**
   * Extract all matches from text using patterns
   */
  extractAll(text: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        matches.push(...match.slice(1)); // Skip full match, get capture groups
      }
    }
    return matches;
  },
  
  /**
   * Replace patterns in text
   */
  replacePatterns(text: string, replacements: Map<RegExp, string>): string {
    let result = text;
    for (const [pattern, replacement] of replacements) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
};
