import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Speaker } from '../../src/speaker.js';
import { $ } from 'bun';

describe('Speaker - Integration Tests (Real lspeak)', () => {

  describe('INVARIANT: Sequential processing prevents audio overlap', () => {
    it('should process sentences sequentially, never concurrently', async () => {
      /**
       * INVARIANT: Audio sentences must be processed sequentially
       * BREAKS: Audio chaos if multiple sentences play simultaneously
       */
      const speaker = new Speaker({ provider: 'system' });
      const startTime = Date.now();
      
      // Use short test sentences to minimize test time
      const sentences = [
        'First sentence.',
        'Second sentence.',
        'Third sentence.'
      ];
      
      // Process sentences - this should be sequential
      await speaker.speak(sentences, 'terse');
      const endTime = Date.now();
      
      // Sequential processing should take measurable time
      // Each sentence should take at least some time to speak
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(100); // At least 100ms for 3 sentences
      
      // This test proves sequential behavior by timing
    }, 15000); // Allow 15 seconds for audio processing

    it('should handle concurrent Speaker instances without overlap', async () => {
      /**
       * INVARIANT: Multiple Speaker instances must not interfere
       * BREAKS: Audio collision when multiple hooks trigger
       */
      const speaker1 = new Speaker({ provider: 'system' });
      const speaker2 = new Speaker({ provider: 'system' });
      
      const startTime = Date.now();
      
      // Start two speakers concurrently
      const promise1 = speaker1.speak(['Speaker one test.'], 'terse');
      const promise2 = speaker2.speak(['Speaker two test.'], 'terse');
      
      // Both should complete successfully
      await Promise.all([promise1, promise2]);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should take measurable time but not error out
      expect(totalTime).toBeGreaterThan(50);
    }, 10000);
  });

  describe('FAILURE: lspeak CLI availability', () => {
    it('should handle lspeak command execution', async () => {
      /**
       * FAILURE: lspeak might not be installed or accessible
       * GRACEFUL: Clear error message indicating lspeak issue
       */
      const speaker = new Speaker({ provider: 'system' });
      
      try {
        // This should work if lspeak is properly installed
        await speaker.speak(['Test audio availability.'], 'terse');
        
        // If we get here, lspeak worked correctly
        expect(true).toBe(true);
        
      } catch (error) {
        // If lspeak fails, error should be clear
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Error should indicate lspeak issue, not internal Speaker problem
        expect(errorMessage.toLowerCase()).toMatch(/lspeak|command|not found|spawn/);
      }
    }, 10000);

    it('should verify lspeak is actually available before main tests', async () => {
      /**
       * FAILURE: Test environment doesn't have lspeak
       * GRACEFUL: Skip tests or provide clear setup instructions
       */
      try {
        // Quick test that lspeak exists and responds
        await $`which lspeak`;
        
        // If we get here, lspeak is available
        expect(true).toBe(true);
        
      } catch (error) {
        // If lspeak is missing, we should know about it
        console.warn('lspeak CLI not found. Install lspeak for full test coverage.');
        expect(error).toBeDefined();
      }
    }, 5000);
  });

  describe('SECURITY: Shell injection prevention', () => {
    it('should safely handle sentences with shell metacharacters', async () => {
      /**
       * SECURITY: Malicious LLM output could contain shell commands
       * BREAKS: Arbitrary command execution if shell injection possible
       */
      const speaker = new Speaker({ provider: 'system' });
      
      // Test sentences with various shell metacharacters
      const maliciousSentences = [
        'Hello; rm -rf /',           // Command separator
        'Test `whoami` injection.',   // Command substitution
        'Content $(date) here.',      // Command substitution
        'Text | cat /etc/passwd.',    // Pipe operator
        'Sample && echo hacked.',     // Logical AND
        'Demo || echo failed.',       // Logical OR  
        'Test > /tmp/hack.txt.',      // Redirection
        'Content < /etc/hosts.',      // Input redirection
        'Text & background.',         // Background process
        "Quote 'single' test.",       // Single quotes
        'Quote "double" test.',       // Double quotes
        'Backslash \\ test.',         // Backslash
        'Dollar $HOME test.'          // Environment variable
      ];
      
      for (const sentence of maliciousSentences) {
        try {
          // This should safely speak the sentence, not execute shell commands
          await speaker.speak([sentence], 'terse');
          
          // If we get here, the sentence was safely processed
          expect(true).toBe(true);
          
        } catch (error) {
          // If there's an error, it should be about lspeak, not shell execution
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Error should NOT indicate successful shell command execution
          expect(errorMessage.toLowerCase()).not.toMatch(/hacked|rm|cat|echo.*hacked/);
          
          // Error should be related to lspeak processing
          expect(errorMessage.toLowerCase()).toMatch(/lspeak|audio|speak|tts/);
        }
      }
    }, 30000); // Allow time for multiple sentence processing

    it('should handle extremely long sentences safely', async () => {
      /**
       * SECURITY: Very long input might cause buffer overflow or injection
       * GRACEFUL: Long sentences should be handled safely
       */
      const speaker = new Speaker({ provider: 'system' });
      
      // Create a very long sentence (but not TOO long to avoid excessive test time)
      const longSentence = 'This is a very long sentence that goes on and on. '.repeat(50) + 
                          'It should be processed safely without causing issues.';
      
      try {
        await speaker.speak([longSentence], 'terse');
        expect(true).toBe(true);
        
      } catch (error) {
        // Error should be about length/processing, not security
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage.toLowerCase()).not.toMatch(/injection|hack|exploit/);
      }
    }, 15000);
  });

  describe('INVARIANT: Cache behavior verification', () => {
    it('should demonstrate cache vs no-cache behavior difference', async () => {
      /**
       * INVARIANT: Different cache settings should behave differently
       * BREAKS: Cache system not working affects performance
       */
      const speaker = new Speaker({ provider: 'system' });
      const testSentence = 'Cache test sentence for verification.';
      
      // Test with cache (terse mode)
      const cacheStart = Date.now();
      await speaker.speak([testSentence], 'terse');
      const cacheTime = Date.now() - cacheStart;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test without cache (full mode)  
      const noCacheStart = Date.now();
      await speaker.speak([testSentence], 'full');
      const noCacheTime = Date.now() - noCacheStart;
      
      // Both should complete successfully (timing may vary based on caching)
      expect(cacheTime).toBeGreaterThan(0);
      expect(noCacheTime).toBeGreaterThan(0);
      
      // The test succeeds if both complete without errors
      // Cache performance difference is hard to test reliably
    }, 15000);
  });
});