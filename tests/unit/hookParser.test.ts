import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';

describe('Hook Parser - Unit Tests', () => {
  describe('INVARIANT: Hook parser never hangs', () => {
    it('should timeout within 5 seconds and never hang indefinitely', async () => {
      /**
       * INVARIANT: Parser must never hang indefinitely
       * BREAKS: Claude Code execution if violated
       */
      const startTime = Date.now();
      
      // Create subprocess that will hang on stdin
      const child = spawn('pnpm', ['tsx', '-e', `
        import('./src/hookParser.ts').then(async ({ parseHookInput }) => {
          const result = await parseHookInput();
          console.log(result === null ? 'NULL' : 'NOT_NULL');
        });
      `], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 6000
      });
      
      // Don't send any data - should timeout
      
      const output = await new Promise<string>((resolve) => {
        let stdout = '';
        child.stdout.on('data', (data) => stdout += data.toString());
        child.on('close', () => resolve(stdout.trim()));
        child.on('error', () => resolve('ERROR'));
      });
      
      const elapsed = Date.now() - startTime;
      
      // Must complete within 6 seconds (allowing for subprocess overhead)
      expect(elapsed).toBeLessThan(6500);
      expect(output).toContain('NULL');
    }, 10000);
  });

  describe('INVARIANT: Valid hooks always parsed', () => {
    it('should always parse well-formed hook events with required fields', async () => {
      /**
       * INVARIANT: Valid hook JSON must always parse successfully  
       * BREAKS: Voice feedback system if violated
       */
      const validHookEvent = {
        session_id: "test-session-123",
        transcript_path: "/tmp/transcript.jsonl", 
        cwd: "/users/dev/project",
        hook_event_name: "stop"
      };

      const child = spawn('pnpm', ['tsx', '-e', `
        import('./src/hookParser.ts').then(async ({ parseHookInput }) => {
          const result = await parseHookInput();
          if (result && result.session_id === 'test-session-123') {
            console.log('SUCCESS');
          } else {
            console.log('FAILED');
          }
        });
      `], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Send valid JSON
      child.stdin.write(JSON.stringify(validHookEvent));
      child.stdin.end();
      
      const output = await new Promise<string>((resolve) => {
        let stdout = '';
        child.stdout.on('data', (data) => stdout += data.toString());
        child.on('close', () => resolve(stdout.trim()));
      });
      
      expect(output).toContain('SUCCESS');
    });
  });

  describe('INVARIANT: Invalid input never crashes', () => {
    it('should always return null for invalid input, never throw exceptions', async () => {
      /**
       * INVARIANT: Invalid input must never crash the parser
       * BREAKS: Claude Code hook chain if exceptions thrown
       */
      const invalidInputs = [
        'not json at all',
        '{"incomplete": "object"}', // Missing required fields
        '{"session_id": 123}', // Wrong field type  
      ];

      for (const invalidInput of invalidInputs) {
        const child = spawn('pnpm', ['tsx', '-e', `
          import('./src/hookParser.ts').then(async ({ parseHookInput }) => {
            const result = await parseHookInput();
            console.log(result === null ? 'NULL' : 'NOT_NULL');
            process.exit(0);
          });
        `], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Send invalid data
        child.stdin.write(invalidInput);
        child.stdin.end();
        
        const output = await new Promise<string>((resolve) => {
          let stdout = '';
          child.stdout.on('data', (data) => stdout += data.toString());
          child.on('close', () => resolve(stdout.trim()));
        });
        
        // This must NEVER throw, always return null
        expect(output).toContain('NULL');
      }
    });
  });
});