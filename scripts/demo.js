#!/usr/bin/env node
/**
 * Quick-start demo for branch-thinking-mcp
 * Usage: npx branch-thinking-mcp demo
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧠 Branch Thinking MCP Demo');
console.log('============================\n');

// Check if built version exists
const distPath = join(projectRoot, 'dist', 'index.js');
if (!fs.existsSync(distPath)) {
  console.error('❌ Built version not found. Please run: npm run build');
  process.exit(1);
}

console.log('Starting Branch Thinking MCP server...');
console.log(`📁 Location: ${distPath}`);
console.log('🔗 Connect via MCP client or use direct tool calls\n');

console.log('Example MCP tool usage:');
console.log('```json');
console.log(JSON.stringify({
  tool: 'branch-thinking',
  arguments: {
    content: 'How to implement user authentication?',
    type: 'analysis',
    keyPoints: ['security', 'scalability', 'user-experience']
  }
}, null, 2));
console.log('```\n');

console.log('Available commands:');
console.log('- addThought: Add new reasoning thought');
console.log('- list: Show all branches');  
console.log('- focus: Switch to specific branch');
console.log('- evaluate: Get quality assessment');
console.log('- findContradictions: Detect conflicts');
console.log('- export/import: Save/load reasoning sessions\n');

console.log('For configuration, see: https://github.com/quanticsoul4772/branch-thinking');
console.log('Press Ctrl+C to stop the demo server\n');

// Start the MCP server
const server = spawn('node', [distPath], {
  stdio: 'inherit',
  cwd: projectRoot
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n🛑 Demo server stopped (exit code: ${code})`);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping demo server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});