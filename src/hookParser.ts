#!/usr/bin/env tsx
// Hook input parser for Claude Code hook events
// Reads JSON from stdin with timeout, returns HookEvent or null

import { HookEvent } from './types.js';

export async function parseHookInput(): Promise<HookEvent | null> {
  try {
    // Create promise that resolves with stdin data or rejects on timeout
    const inputPromise = new Promise<string>((resolve, reject) => {
      let data = '';
      
      // 1 second timeout - must be less than hook processing limit of 2 seconds
      const timeout = setTimeout(() => {
        reject(new Error('Timeout reading stdin'));
      }, 1000);

      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });

      process.stdin.on('end', () => {
        clearTimeout(timeout);
        resolve(data.trim());
      });

      process.stdin.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Start reading
      process.stdin.resume();
    });

    const input = await inputPromise;
    
    if (!input) {
      return null;
    }

    // Parse JSON and validate it matches HookEvent interface
    const parsed = JSON.parse(input);
    
    // Basic validation - ensure required fields exist
    if (typeof parsed.session_id !== 'string' ||
        typeof parsed.transcript_path !== 'string' ||
        typeof parsed.cwd !== 'string' ||
        typeof parsed.hook_event_name !== 'string') {
      return null;
    }

    return parsed as HookEvent;
    
  } catch (error) {
    // Invalid JSON or timeout - return null, don't throw
    return null;
  }
}

// When run directly, demonstrate the parser
async function main() {
  if (process.argv[1]?.endsWith('hookParser.ts') || process.argv[1]?.endsWith('hookParser.js')) {
    const result = await parseHookInput();
    if (result) {
      // Output JSON result for testing/debugging
      process.stdout.write(JSON.stringify(result, null, 2));
    }
    // Exit silently if no valid input
  }
}

// Only run main if this file is executed directly
if (process.argv[1]?.includes('hookParser')) {
  main().catch(() => process.exit(1));
}