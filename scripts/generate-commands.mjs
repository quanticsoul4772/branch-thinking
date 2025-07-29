#!/usr/bin/env node

// Script to generate remaining command classes based on patterns in index.ts

import { writeFileSync } from 'fs';
import { join } from 'path';

const commandsDir = join(process.cwd(), 'src/commands');

const simpleCommands = [
  {
    name: 'StatisticsCommand',
    method: 'getReasoningStatistics',
    needsBranchId: false,
    responseWrapper: 'stats'
  },
  {
    name: 'FindContradictionsCommand', 
    method: 'findContradictions',
    needsBranchId: false,
    wrapper: { contradictions: true, count: true }
  },
  {
    name: 'DetectCircularCommand',
    method: 'detectCircularReasoning', 
    needsBranchId: false,
    wrapper: { circularPaths: true, hasCircularReasoning: true }
  },
  {
    name: 'ToggleAutoEvalCommand',
    method: 'toggleAutoEval',
    needsBranchId: false,
    custom: true
  },
  {
    name: 'CompareProfilesCommand',
    method: 'compareProfiles',
    needsBranchId: false,
    async: true
  },
  {
    name: 'SuggestMergesCommand',
    method: 'suggestMerges',
    needsBranchId: false,
    async: true
  },
  {
    name: 'DetectDriftCommand',
    method: 'detectDrift',
    needsBranchId: false,
    async: true
  }
];

const branchCommands = [
  {
    name: 'SuggestToolsCommand',
    method: 'suggestTools',
    optional: true
  },
  {
    name: 'GenerateCounterfactualsCommand',
    method: 'generateCounterfactuals',
    optional: true,
    async: true
  },
  {
    name: 'DetectKnowledgeGapsCommand',
    method: 'detectKnowledgeGaps',
    optional: true,
    async: true
  }
];

const parameterCommands = [
  {
    name: 'FindStrongestPathsCommand',
    paramName: 'query',
    method: 'findStrongestPaths',
    errorMsg: 'Target conclusion required'
  },
  {
    name: 'PruneCommand',
    paramName: 'threshold',
    paramPath: 'data?.threshold',
    method: 'pruneLowScoringBranches',
    defaultValue: 'getConfig().branch.pruneThreshold',
    async: true
  },
  {
    name: 'ConfigAutoEvalCommand',
    paramName: 'config',
    paramPath: 'data',
    method: 'setAutoEvaluationConfig',
    showCurrentIfMissing: true
  },
  {
    name: 'FindSimilarCommand',
    paramName: 'query',
    method: 'findSimilar',
    additionalParams: ['data?.limit || 10'],
    async: true,
    errorMsg: 'query required for findSimilar command'
  }
];

const dataCommands = [
  {
    name: 'SynthesizeDialecticalCommand',
    requiredFields: ['branch1Id'],
    method: 'synthesizeDialectical',
    params: ['data.branch1Id', 'data.branch2Id'],
    async: true
  },
  {
    name: 'JumpToRelatedCommand',
    requiredFields: ['thoughtId'],
    method: 'jumpToRelated',
    params: ['data.thoughtId', 'data.limit || 5'],
    async: true
  },
  {
    name: 'SemanticPathCommand',
    requiredFields: ['fromThoughtId', 'toThoughtId'],
    method: 'semanticPath',
    params: ['data.fromThoughtId', 'data.toThoughtId'],
    async: true
  }
];

// Generate simple commands
simpleCommands.forEach(cmd => {
  const content = `import { Command, CommandData, CommandResult } from './Command.js';

export class ${cmd.name} extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    try {
      ${cmd.async ? 'const result = await' : 'const result ='} this.branchManager.${cmd.method}();
      
      ${cmd.wrapper ? 
        `return this.createSuccessResponse({
        ${Object.keys(cmd.wrapper).map(key => 
          cmd.wrapper[key] === true 
            ? `${key}: result${key === 'count' ? '.length' : ''}`
            : `${key}: ${cmd.wrapper[key]}`
        ).join(',\n        ')}
      });` :
        cmd.custom ?
        `const config = this.branchManager.getAutoEvaluationConfig();
      config.enabled = !config.enabled;
      this.branchManager.setAutoEvaluationConfig(config);
      
      return this.createSuccessResponse({
        status: 'success',
        message: \`Auto-evaluation \${config.enabled ? 'enabled' : 'disabled'}\`,
        config
      });` :
        `return this.createSuccessResponse(result);`
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}
`;
  
  writeFileSync(join(commandsDir, `${cmd.name}.ts`), content);
  console.log(`Created ${cmd.name}.ts`);
});

// Generate branch-based commands
branchCommands.forEach(cmd => {
  const content = `import { Command, CommandData, CommandResult } from './Command.js';

export class ${cmd.name} extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    const branchId = data.branchId${cmd.optional ? ' || this.branchManager.getActiveBranch()?.id' : ''};
    ${!cmd.optional ? `if (!branchId) {
      return this.createErrorResponse('No branch specified');
    }` : 
    `if (!branchId) {
      return this.createErrorResponse('No branch specified or active');
    }`}
    
    try {
      const result = ${cmd.async ? 'await ' : ''}this.branchManager.${cmd.method}(branchId);
      ${cmd.method === 'suggestTools' ? 
      `if (!result) {
        return this.createErrorResponse('Branch not found');
      }

      return this.createSuccessResponse({
        branchId,
        suggestions: result,
        message: result.length > 0 
          ? \`Found \${result.length} relevant tools for this branch\`
          : 'No specific tool suggestions for current branch content'
      });` :
      `return this.createSuccessResponse(result);`}
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}
`;
  
  writeFileSync(join(commandsDir, `${cmd.name}.ts`), content);
  console.log(`Created ${cmd.name}.ts`);
});

// Generate parameter-based commands
parameterCommands.forEach(cmd => {
  const paramAccess = cmd.paramPath || cmd.paramName;
  const content = `import { Command, CommandData, CommandResult } from './Command.js';
${cmd.defaultValue ? "import { getConfig } from '../config.js';" : ''}

export class ${cmd.name} extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    ${cmd.showCurrentIfMissing ? 
    `if (!data.${paramAccess}) {
      // Return current config
      const config = this.branchManager.getAutoEvaluationConfig();
      return this.createSuccessResponse({
        status: 'success',
        currentConfig: config
      });
    }` :
    cmd.defaultValue ?
    `const ${cmd.paramName} = data.${paramAccess} || ${cmd.defaultValue};` :
    `if (!data.${cmd.paramName}) {
      return this.createErrorResponse('${cmd.errorMsg || cmd.paramName + ' required'}');
    }`}
    
    try {
      ${cmd.showCurrentIfMissing ? 
      `// Update config
      this.branchManager.setAutoEvaluationConfig(data.${paramAccess});
      const newConfig = this.branchManager.getAutoEvaluationConfig();
      
      return this.createSuccessResponse({
        status: 'success',
        message: 'Auto-evaluation configuration updated',
        config: newConfig
      });` :
      `const result = ${cmd.async ? 'await ' : ''}this.branchManager.${cmd.method}(${
        cmd.defaultValue ? cmd.paramName : 
        cmd.additionalParams ? `data.${cmd.paramName}, ${cmd.additionalParams.join(', ')}` :
        `data.${cmd.paramName}`
      });
      return this.createSuccessResponse(result);`}
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}
`;
  
  writeFileSync(join(commandsDir, `${cmd.name}.ts`), content);
  console.log(`Created ${cmd.name}.ts`);
});

// Generate data-based commands
dataCommands.forEach(cmd => {
  const content = `import { Command, CommandData, CommandResult } from './Command.js';

export class ${cmd.name} extends Command {
  async execute(data: CommandData): Promise<CommandResult> {
    ${cmd.requiredFields.map(field => 
    `if (!data.data?.${field}) {
      return this.createErrorResponse('${field} required in data for ${cmd.method} command');
    }`).join('\n    ')}
    
    try {
      const result = ${cmd.async ? 'await ' : ''}this.branchManager.${cmd.method}(
        ${cmd.params.join(',\n        ')}
      );
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}
`;
  
  writeFileSync(join(commandsDir, `${cmd.name}.ts`), content);
  console.log(`Created ${cmd.name}.ts`);
});

console.log('\nDone! Now update CommandHandler.ts to register all commands.');
