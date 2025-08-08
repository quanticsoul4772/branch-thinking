/**
 * Configuration loader with environment support and runtime updates
 */

import * as fs from 'fs';
import * as path from 'path';

// Default configuration structure
export interface BranchThinkingConfig {
  evaluation: {
    weights: {
      coherence: number;
      contradiction: number;
      convergence: number;
      specificity: number;
      confidence: number;
      repetition: number;
    };
    thresholds: {
      similarity: number;
      redundancy: number;
      contradiction: number;
      convergence: number;
      prune: number;
    };
    qualityThresholds: {
      excellent: number;
      good: number;
      moderate: number;
    };
    windowSize: number;
  };
  tools: {
    suggestionWeights: {
      nameMatch: number;
      descriptionMatch: number;
      contextMatch: number;
      frequencyBoost: number;
    };
  };
  graph: {
    windowSize: number;
    bloomFilter: {
      size: number;
      hashFunctions: number;
    };
  };
  display: {
    thoughtCharacterLimit: number;
    recentThoughtCount: number;
    strongestPathsCount: number;
    maxThoughtsToShow: number;
  };
  autoEval: {
    enabled: boolean;
    threshold: number;
  };
}

// Default configuration
const DEFAULT_CONFIG: BranchThinkingConfig = {
  evaluation: {
    weights: {
      coherence: 0.2,
      contradiction: 0.25,
      convergence: 0.2,
      specificity: 0.15,
      confidence: 0.1,
      repetition: 0.1
    },
    thresholds: {
      similarity: 0.7,
      redundancy: 0.5,
      contradiction: 0.7,
      convergence: 0.6,
      prune: 0.3
    },
    qualityThresholds: {
      excellent: 0.8,
      good: 0.6,
      moderate: 0.4
    },
    windowSize: 5
  },
  tools: {
    suggestionWeights: {
      nameMatch: 0.4,
      descriptionMatch: 0.3,
      contextMatch: 0.2,
      frequencyBoost: 0.1
    }
  },
  graph: {
    windowSize: 10,
    bloomFilter: {
      size: 10000,
      hashFunctions: 5
    }
  },
  display: {
    thoughtCharacterLimit: 80,
    recentThoughtCount: 3,
    strongestPathsCount: 5,
    maxThoughtsToShow: 10
  },
  autoEval: {
    enabled: true,
    threshold: 0.35
  }
};

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: BranchThinkingConfig;
  private configPath: string;
  private environment: string;
  private watchers: Map<string, (config: BranchThinkingConfig) => void> = new Map();

  private constructor() {
    this.environment = process.env.BRANCH_THINKING_ENV || 'default';
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Get the current configuration
   */
  getConfig(): BranchThinkingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<BranchThinkingConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    this.notifyWatchers();
    this.saveConfig();
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.notifyWatchers();
    this.saveConfig();
  }

  /**
   * Watch for configuration changes
   */
  watch(id: string, callback: (config: BranchThinkingConfig) => void): void {
    this.watchers.set(id, callback);
  }

  /**
   * Stop watching configuration changes
   */
  unwatch(id: string): void {
    this.watchers.delete(id);
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): BranchThinkingConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);
        return this.deepMerge(DEFAULT_CONFIG, loadedConfig);
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}:`, error);
    }
    
    // Try environment-specific config
    const envConfigPath = this.getEnvConfigPath();
    try {
      if (fs.existsSync(envConfigPath)) {
        const configData = fs.readFileSync(envConfigPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);
        return this.deepMerge(DEFAULT_CONFIG, loadedConfig);
      }
    } catch (error) {
      console.warn(`Failed to load env config from ${envConfigPath}:`, error);
    }
    
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save current configuration to file
   */
  private saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * Get configuration file path
   */
  private getConfigPath(): string {
    const configDir = process.env.BRANCH_THINKING_CONFIG_DIR || 
      path.join(process.cwd(), 'config');
    return path.join(configDir, 'branch-thinking.json');
  }

  /**
   * Get environment-specific config path
   */
  private getEnvConfigPath(): string {
    const configDir = process.env.BRANCH_THINKING_CONFIG_DIR || 
      path.join(process.cwd(), 'config');
    return path.join(configDir, `branch-thinking.${this.environment}.json`);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Notify all watchers of configuration change
   */
  private notifyWatchers(): void {
    for (const callback of this.watchers.values()) {
      callback(this.getConfig());
    }
  }

  /**
   * Export configuration to different formats
   */
  exportConfig(format: 'json' | 'yaml' | 'env' = 'json'): string {
    switch (format) {
    case 'json':
      return JSON.stringify(this.config, null, 2);
      
    case 'yaml':
      return this.toYaml(this.config);
      
    case 'env':
      return this.toEnv(this.config);
      
    default:
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert config to YAML format
   */
  private toYaml(obj: any, indent = 0): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.isObject(value)) {
        yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 2)}`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
    
    return yaml;
  }

  /**
   * Convert config to environment variables format
   */
  private toEnv(obj: any, prefix = 'BRANCH_THINKING'): string {
    let env = '';
    
    const flatten = (current: any, prop = ''): void => {
      if (this.isObject(current)) {
        for (const key in current) {
          flatten(current[key], prop ? `${prop}_${key}` : key);
        }
      } else {
        const envKey = `${prefix}_${prop}`.toUpperCase();
        env += `${envKey}=${current}\n`;
      }
    };
    
    flatten(obj);
    return env;
  }
}

// Export singleton instance
export const configLoader = ConfigLoader.getInstance();

// Export helper to get config directly
export const CONFIG = configLoader.getConfig();

// Export update function for runtime changes
export const updateConfig = (updates: Partial<BranchThinkingConfig>) => {
  configLoader.updateConfig(updates);
};

// Export watch function for reactive updates
export const watchConfig = (id: string, callback: (config: BranchThinkingConfig) => void) => {
  configLoader.watch(id, callback);
};
