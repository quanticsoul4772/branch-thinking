/* global process */
#!/usr/bin/env node

/**
 * OpenAPI specification server for Branch Thinking MCP Server
 * Serves the OpenAPI spec at /openapi.json endpoint
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read and parse the OpenAPI spec
let openApiSpec: any;
try {
  const yamlContent = readFileSync(join(rootDir, 'spec', 'openapi.yaml'), 'utf8');
  openApiSpec = yaml.load(yamlContent);
} catch (error) {
  console.error('Failed to load OpenAPI spec:', error);
  process.exit(1);
}


const server = createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/openapi.json') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(openApiSpec, null, 2));
    return;
  }
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not found', 
    availableEndpoints: ['/openapi.json', '/health'] 
  }));
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`OpenAPI server running on port ${port}`);
  console.log(`OpenAPI spec available at: http://localhost:${port}/openapi.json`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});