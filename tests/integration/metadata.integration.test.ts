import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../../src/metadata.js';

describe('Metadata Parser - Integration Tests', () => {

  describe('FAILURE: Claude format evolution', () => {
    it('should degrade gracefully when Claude output format changes', () => {
      /**
       * FAILURE: Claude changes output format slightly
       * GRACEFUL: Return null, don't crash downstream processing
       */
      const potentialFormatChanges = [
        // Slight format variations that might appear
        'clarvis: [mode:development project:test]',  // Extra space before bracket
        'clarvis:[Mode:development Project:test]',   // Capitalized fields
        'clarvis:[mode="development" project="test"]', // Quoted values
        'clarvis:[mode:development,project:test]',   // Comma instead of space
        'clarvis:[mode:development; project:test]',  // Semicolon separator
        'clarvis:[type:development project:test]',   // 'type' instead of 'mode'
        'clarvis:[mode:development app:test]',       // 'app' instead of 'project'
        'clarvis{mode:development project:test}',    // Braces instead of brackets
        'clarvis:(mode:development project:test)',   // Parentheses instead of brackets
        'Claude:[mode:development project:test]',    // Different prefix
        'clarvis-metadata:[mode:development project:test]', // Extended prefix
      ];

      for (const modifiedFormat of potentialFormatChanges) {
        const result = extractMetadata(modifiedFormat);
        
        // System must degrade gracefully - return null for unrecognized formats
        // This prevents downstream errors while maintaining system stability
        expect(result).toBeNull();
        
        // Ensure no exceptions are thrown during format evolution
        expect(() => extractMetadata(modifiedFormat)).not.toThrow();
      }
    });

    it('should handle realistic Claude message variations', () => {
      /**
       * FAILURE: Claude output varies in real usage patterns
       * GRACEFUL: Parse valid formats, reject invalid ones predictably
       */
      const realisticVariations = [
        // Valid cases that should work
        { 
          input: 'clarvis:[mode:development project:my-awesome-app]\n\nI\'ve completed the feature implementation.',
          shouldParse: true,
          expectedMode: 'development',
          expectedProject: 'my-awesome-app'
        },
        { 
          input: 'Task completed successfully.\n\nclarvis:[mode:writing project:blog]\n\nThe article is ready.',
          shouldParse: true,
          expectedMode: 'writing', 
          expectedProject: 'blog'
        },
        // Invalid cases that should fail gracefully
        { 
          input: 'I completed the task but forgot the metadata.',
          shouldParse: false
        },
        { 
          input: 'clarvis:[mode:development project:test extra:data]\nWith extra fields.',
          shouldParse: false  // Current regex doesn't support extra fields
        },
      ];

      for (const variation of realisticVariations) {
        const result = extractMetadata(variation.input);
        
        if (variation.shouldParse) {
          expect(result).not.toBeNull();
          expect(result?.mode).toBe(variation.expectedMode);
          expect(result?.project).toBe(variation.expectedProject);
        } else {
          expect(result).toBeNull();
        }
      }
    });
  });

  describe('FAILURE: Unexpected project characters', () => {
    it('should handle special characters in project names safely', () => {
      /**
       * FAILURE: Project names contain unexpected characters
       * GRACEFUL: Either parse safely or reject cleanly
       */
      const specialCharacterTests = [
        // Test characters that are not allowed by regex [\w-]+
        { project: 'test.app', expectParse: false },      // Periods not allowed by regex
        { project: 'test/app', expectParse: false },      // Slashes not allowed
        { project: 'test app', expectParse: false },      // Spaces not allowed
        { project: 'test@app', expectParse: false },      // Special chars not allowed
        { project: 'test&app', expectParse: false },      // Ampersands not allowed
        { project: 'test%app', expectParse: false },      // Percent signs not allowed
        { project: 'test#app', expectParse: false },      // Hash signs not allowed
        { project: 'test!app', expectParse: false },      // Exclamation marks not allowed
        
        // Test characters that ARE allowed by regex [\w-]+
        { project: 'test_app', expectParse: true },       // Underscores allowed by \w
        { project: 'test-app', expectParse: true },       // Hyphens explicitly allowed
        { project: 'testapp123', expectParse: true },     // Numbers allowed by \w
        { project: 'TEST', expectParse: true },           // Uppercase allowed by \w
        { project: 'a', expectParse: true },              // Single character should work
        { project: 'CON', expectParse: true },            // Windows reserved names allowed by regex
      ];

      for (const test of specialCharacterTests) {
        const message = `clarvis:[mode:development project:${test.project}]`;
        const result = extractMetadata(message);
        
        if (test.expectParse) {
          expect(result).not.toBeNull();
          expect(result?.project).toBe(test.project);
        } else {
          // Must reject unsafe project names cleanly
          expect(result).toBeNull();
        }
        
        // Never throw exceptions, even with special characters
        expect(() => extractMetadata(message)).not.toThrow();
      }
    });

    it('should prevent potential injection through project names', () => {
      /**
       * FAILURE: Project names could contain malicious content
       * GRACEFUL: Reject anything that could cause downstream issues
       */
      const potentialInjections = [
        'project"; rm -rf /',           // Command injection attempt - contains quotes/semicolons
        'project</script>',             // Script injection attempt - contains angle brackets
        'project${exec}',               // Template injection attempt - contains special chars
        'project`rm -rf /`',            // Backtick injection attempt - contains backticks
        'project||rm',                  // Command chaining attempt - contains pipes
        'project\nrm -rf /',            // Newline injection attempt - contains newlines
        'project\0',                    // Null byte injection - contains null bytes
        '../../../etc/passwd',          // Path traversal attempt - contains dots/slashes
        'project with spaces',          // Space injection - contains spaces
        'project@domain.com',           // Email-like injection - contains @ and dots
      ];

      for (const maliciousProject of potentialInjections) {
        const message = `clarvis:[mode:development project:${maliciousProject}]`;
        const result = extractMetadata(message);
        
        // All malicious project names should be rejected by regex [\w-]+
        expect(result).toBeNull();
        
        // Parser must never crash on malicious input
        expect(() => extractMetadata(message)).not.toThrow();
      }
    });
  });

  describe('FAILURE: Unicode and encoding edge cases', () => {
    it('should handle unicode characters appropriately', () => {
      /**
       * FAILURE: Unicode characters appear in metadata
       * GRACEFUL: Handle or reject predictably
       */
      const unicodeTests = [
        { input: 'clarvis:[mode:development project:tést]', shouldParse: false },  // Accented chars
        { input: 'clarvis:[mode:development project:测试]', shouldParse: false },   // Chinese chars
        { input: 'clarvis:[mode:development project:🚀]', shouldParse: false },    // Emoji
        { input: 'clarvis:[mode:development project:café]', shouldParse: false },  // Unicode in project
        { input: 'clarvis:[mode:développement project:test]', shouldParse: false }, // Unicode in mode
        { input: 'clarvis:[mode:development project:test-αβγ]', shouldParse: false }, // Greek letters
      ];

      for (const test of unicodeTests) {
        const result = extractMetadata(test.input);
        
        if (test.shouldParse) {
          expect(result).not.toBeNull();
        } else {
          // Current regex should reject unicode characters
          expect(result).toBeNull();
        }
        
        // Must handle unicode gracefully without crashing
        expect(() => extractMetadata(test.input)).not.toThrow();
      }
    });
  });
});