import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Hook Parser - Integration Tests', () => {

  describe('INVARIANT: Resources always cleaned up', () => {
    it('should process hooks without leaving hanging processes', async () => {
      /**
       * INVARIANT: Hook processing must not leak resources
       * BREAKS: System stability if processes accumulate
       */
      // Test that parser cleans up properly on timeout
      const child = spawn('pnpm', ['tsx', '-e', `
        import('./src/hookParser.ts').then(async ({ parseHookInput }) => {
          // Don't provide any input, let it timeout
          const result = await parseHookInput();
          if (result === null) {
            console.log('CLEANED_UP');
            process.exit(0);
          } else {
            console.log('ERROR');
            process.exit(1);
          }
        });
      `], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const output = await new Promise<string>((resolve) => {
        let stdout = '';
        child.stdout.on('data', (data) => stdout += data.toString());
        child.on('close', () => resolve(stdout.trim()));
      });

      expect(output).toContain('CLEANED_UP');
    }, 10000);
  });

  describe('FAILURE: Empty stdin timeout', () => {
    it('should handle empty stdin by timing out gracefully', async () => {
      /**
       * FAILURE: No stdin input provided
       * GRACEFUL: Clean timeout without hanging
       */
      const testScript = `
        import { parseHookInput } from './src/hookParser.js';
        
        // Close stdin immediately to simulate no input
        setTimeout(() => process.stdin.end(), 100);
        
        const result = await parseHookInput();
        console.log(result === null ? 'SUCCESS_NULL' : 'FAILED_NOT_NULL');
        process.exit(0);
      `;
      
      const testFile = join(process.cwd(), 'test-empty-stdin.ts');
      await writeFile(testFile, testScript);
      
      try {
        const startTime = Date.now();
        const child = spawn('pnpm', ['tsx', testFile], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 7000
        });

        // Don't write anything to stdin - simulate empty input
        child.stdin.end();

        const output = await new Promise<string>((resolve, reject) => {
          let stdout = '';
          child.stdout.on('data', (data) => stdout += data.toString());
          child.on('close', (code) => {
            if (code === 0) resolve(stdout.trim());
            else reject(new Error(`Process exited with code ${code}`));
          });
          child.on('error', reject);
        });

        const elapsed = Date.now() - startTime;
        
        expect(output).toContain('SUCCESS_NULL');
        expect(elapsed).toBeLessThan(6000); // Should complete within timeout
      } finally {
        await unlink(testFile).catch(() => {});
      }
    }, 8000);
  });

  describe('FAILURE: Malformed JSON handling', () => {
    it('should gracefully handle various malformed JSON inputs', async () => {
      /**
       * FAILURE: Claude Code sends malformed JSON
       * GRACEFUL: Return null, continue processing
       */
      const malformedInputs = [
        'not json',
        '{"incomplete":',
        '{"session_id": "test"', // Incomplete
        '{session_id: "test"}', // Invalid JSON syntax
      ];

      for (const malformedInput of malformedInputs) {
        const testScript = `
          import { parseHookInput } from './src/hookParser.js';
          const result = await parseHookInput();
          console.log(result === null ? 'SUCCESS_NULL' : 'FAILED_NOT_NULL');
          process.exit(0);
        `;
        
        const testFile = join(process.cwd(), `test-malformed-${Date.now()}.ts`);
        await writeFile(testFile, testScript);
        
        try {
          const child = spawn('pnpm', ['tsx', testFile], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 6000
          });

          // Send malformed input
          child.stdin.write(malformedInput);
          child.stdin.end();

          const output = await new Promise<string>((resolve, reject) => {
            let stdout = '';
            child.stdout.on('data', (data) => stdout += data.toString());
            child.on('close', (code) => {
              if (code === 0) resolve(stdout.trim());
              else reject(new Error(`Process exited with code ${code}`));
            });
            child.on('error', reject);
          });

          expect(output).toContain('SUCCESS_NULL');
        } finally {
          await unlink(testFile).catch(() => {});
        }
      }
    }, 15000);
  });

  describe('FAILURE: Concurrent hook safety', () => {
    it('should handle multiple rapid hook events without interference', async () => {
      /**
       * FAILURE: Multiple Claude Code hooks fire rapidly
       * GRACEFUL: Each processes independently, no interference
       */
      const concurrentTests = Array.from({ length: 3 }, async (_, i) => {
        const hookEvent = JSON.stringify({
          session_id: `concurrent-${i}`,
          transcript_path: `/tmp/concurrent-${i}.jsonl`,
          cwd: '/tmp',
          hook_event_name: 'stop'
        });

        const testScript = `
          import { parseHookInput } from './src/hookParser.js';
          const result = await parseHookInput();
          if (result && result.session_id === 'concurrent-${i}') {
            console.log('SUCCESS_CORRECT_PARSE');
          } else {
            console.log('FAILED_WRONG_PARSE');
          }
          process.exit(0);
        `;
        
        const testFile = join(process.cwd(), `test-concurrent-${i}-${Date.now()}.ts`);
        await writeFile(testFile, testScript);
        
        try {
          const child = spawn('pnpm', ['tsx', testFile], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 6000
          });

          // Send input specific to this concurrent test
          child.stdin.write(hookEvent);
          child.stdin.end();

          const output = await new Promise<string>((resolve, reject) => {
            let stdout = '';
            child.stdout.on('data', (data) => stdout += data.toString());
            child.on('close', (code) => {
              if (code === 0) resolve(stdout.trim());
              else reject(new Error(`Process exited with code ${code}`));
            });
            child.on('error', reject);
          });
          
          return output;
        } finally {
          await unlink(testFile).catch(() => {});
        }
      });

      const results = await Promise.all(concurrentTests);
      
      // Each concurrent test should succeed independently
      results.forEach((output, index) => {
        expect(output).toContain('SUCCESS_CORRECT_PARSE');
      });
    }, 12000);
  });
});