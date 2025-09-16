import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../../src/metadata.js';

describe('Metadata Parser - Unit Tests', () => {
  
  describe('INVARIANT: Valid modes always extracted', () => {
    it('should always extract standard mode strings correctly', () => {
      /**
       * INVARIANT: Valid modes must always parse successfully
       * BREAKS: Notification skipping if violated
       */
      const validModes = ['default', 'development', 'writing', 'research', 'conversation'];
      
      for (const mode of validModes) {
        const message = `clarvis:[mode:${mode} project:test]`;
        const result = extractMetadata(message);
        
        // This must ALWAYS succeed for valid modes
        expect(result).not.toBeNull();
        expect(result?.mode).toBe(mode);
        expect(result?.project).toBe('test');
      }
    });

    it('should extract modes from messages with content after metadata', () => {
      /**
       * INVARIANT: Modes must parse regardless of message content
       * BREAKS: Notification system if metadata ignored
       */
      const testCases = [
        'clarvis:[mode:development project:myapp]\nI have completed the task.',
        'clarvis:[mode:writing project:blog-post]\n\nThe article is ready for review.',
        'clarvis:[mode:research project:data-analysis]\n\n## Results\n\nFindings show...'
      ];

      for (const message of testCases) {
        const result = extractMetadata(message);
        
        expect(result).not.toBeNull();
        expect(result?.mode).toMatch(/^(development|writing|research)$/);
        expect(result?.project).toMatch(/^[\w-]+$/);
      }
    });
  });

  describe('INVARIANT: Invalid modes always rejected', () => {
    it('should always return null for unknown mode strings', () => {
      /**
       * INVARIANT: Invalid modes must never pass through
       * BREAKS: Downstream processing if violated
       */
      const invalidModes = ['invalid', 'debug', 'test', 'production', 'staging', 'unknown'];
      
      for (const mode of invalidModes) {
        const message = `clarvis:[mode:${mode} project:test]`;
        const result = extractMetadata(message);
        
        // This must ALWAYS return null for invalid modes
        expect(result).toBeNull();
      }
    });

    it('should reject empty or malformed mode values', () => {
      /**
       * INVARIANT: Malformed modes must be rejected
       * BREAKS: Type safety if violated
       */
      const malformedCases = [
        'clarvis:[mode: project:test]',      // Empty mode
        'clarvis:[mode:dev project:test]',   // 'dev' not in valid modes 
        'clarvis:[mode:123 project:test]',   // Numeric mode
        'clarvis:[mode:test-mode project:test]', // Hyphenated mode not valid
      ];

      for (const message of malformedCases) {
        const result = extractMetadata(message);
        expect(result).toBeNull();
      }
    });
  });

  describe('INVARIANT: Project names always extracted', () => {
    it('should extract various valid project name formats', () => {
      /**
       * INVARIANT: Well-formed project names must parse correctly
       * BREAKS: Speech identification if violated
       */
      const validProjectNames = [
        'test',
        'my-app', 
        'blog-post',
        'data-analysis',
        'project123',
        'clarvis',
        'long-project-name-with-hyphens'
      ];

      for (const projectName of validProjectNames) {
        const message = `clarvis:[mode:development project:${projectName}]`;
        const result = extractMetadata(message);
        
        expect(result).not.toBeNull();
        expect(result?.project).toBe(projectName);
        expect(result?.mode).toBe('development');
      }
    });

    it('should handle project names at various message positions', () => {
      /**
       * INVARIANT: Project extraction must be position-independent
       * BREAKS: Context awareness if violated
       */
      const testCases = [
        { message: 'clarvis:[mode:development project:frontend]', expected: 'frontend' },
        { message: 'Some text\nclarvis:[mode:research project:backend]', expected: 'backend' },
        { message: 'clarvis:[mode:writing project:documentation]\nContent follows', expected: 'documentation' }
      ];

      for (const testCase of testCases) {
        const result = extractMetadata(testCase.message);
        expect(result?.project).toBe(testCase.expected);
      }
    });
  });

  describe('INVARIANT: Malformed input never crashes', () => {
    it('should always return null for invalid input, never throw exceptions', () => {
      /**
       * INVARIANT: Invalid input must never crash the parser
       * BREAKS: Hook chain if exceptions thrown
       */
      const invalidInputs = [
        'no metadata here',
        'clarvis:[invalid format]',
        'clarvis:[mode:development]',        // Missing project
        'clarvis:[project:test]',            // Missing mode
        'clarvis:[mode:development project:]', // Empty project
        'clarvis:[mode: project:test]',      // Empty mode
        'clarvis:mode:development project:test]', // Missing opening bracket
        'clarvis:[mode:development project:test', // Missing closing bracket
        '',                                  // Empty string
        'clarvis:[mode:development project:test extra:field]', // Extra fields
        'CLARVIS:[MODE:DEVELOPMENT PROJECT:TEST]', // Wrong case
      ];

      for (const invalidInput of invalidInputs) {
        // This must NEVER throw exceptions
        expect(() => extractMetadata(invalidInput)).not.toThrow();
        
        // And must return null for invalid input
        const result = extractMetadata(invalidInput);
        expect(result).toBeNull();
      }
    });

    it('should handle extreme input cases gracefully', () => {
      /**
       * INVARIANT: Parser must be robust against any input
       * BREAKS: System stability if violated
       */
      const extremeCases = [
        'clarvis:[mode:'.repeat(1000) + 'development project:test]', // Very long prefix
        'clarvis:[mode:development project:' + 'a'.repeat(1000) + ']', // Very long project
        'clarvis:[mode:development project:test]\n' + 'x'.repeat(10000), // Long content after
        'clarvis:[mode:development project:test]\0\0\0', // Null bytes
        'clarvis:[mode:development project:test\n]', // Newlines in project
        'clarvis:[mode:development\tproject:test]', // Tabs instead of spaces
      ];

      for (const extremeCase of extremeCases) {
        // Must never throw exceptions on extreme input
        expect(() => extractMetadata(extremeCase)).not.toThrow();
        
        // Result should be predictable - either null or valid metadata
        const result = extractMetadata(extremeCase);
        const isValidResult = result === null || 
          (typeof result === 'object' && result !== null && 
           typeof result.mode === 'string' && typeof result.project === 'string');
        expect(isValidResult).toBe(true);
      }
    });
  });
});