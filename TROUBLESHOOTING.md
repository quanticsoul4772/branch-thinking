# Troubleshooting Guide - Branch-Thinking MCP Server

## JSON Parsing Error Fix

### Problem
When starting the branch-thinking MCP server, you might see an error like:
```
MCP branch-thinking: Unexpected token 'I', "[INFO] Regi"... is not valid JSON
```

### Root Cause
The `@xenova/transformers` library outputs initialization messages to stdout, which corrupts the MCP JSON-RPC protocol. MCP servers must only output valid JSON-RPC messages to stdout.

### Solution
The fix is implemented in `src/index.ts` and involves:

1. **Early Output Suppression**: All console and stdout interception MUST happen before ANY imports
2. **Environment Variables**: Set production environment variables to suppress library output
3. **Console Silencing**: All console methods are replaced with no-op functions
4. **Stdout Filtering**: Only properly formatted JSON-RPC messages are allowed through

### Implementation Details

```typescript
#!/usr/bin/env node

// This MUST be the first code that runs
process.env.NODE_ENV = 'production';
process.env.TRANSFORMERS_VERBOSITY = 'error';
// ... other env vars

// Intercept stdout before imports
process.stdout.write = function(chunk: any, ...) {
  const str = chunk?.toString() || '';
  if (str.includes('"jsonrpc"') && str.includes('"2.0"')) {
    return originalWrite(chunk, ...);
  }
  return true; // Silently discard
};

// Then imports...
```

### Testing
Run the test script to verify clean startup:
```bash
./test-server-startup.sh
```

### Key Points
- Output suppression MUST occur before any imports
- Environment variables help suppress third-party library output
- The fix prevents any library from corrupting the protocol
- All functionality is preserved while ensuring protocol compliance

## Other Common Issues

### TypeScript Compilation Errors
- Ensure all type assertions are properly handled
- Use `as any` for library-specific configurations that lack proper types

### Performance Issues
- The semantic similarity model loads on first use
- Consider implementing lazy loading for faster startup

### Memory Usage
- Monitor embedding cache size
- Clear cache periodically for long-running sessions