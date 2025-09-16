import { describe, it, expect, vi } from 'vitest';
import { LLMClient } from '../../src/llm.js';
import type { Config } from '../../src/types.js';

describe('LLMClient - Integration Tests', () => {

  describe('FAILURE: API timeout or rate limit', () => {
    it('should bubble up API errors gracefully for retry handling', async () => {
      /**
       * FAILURE: API timeout or 429 rate limit
       * GRACEFUL: Error bubbles up with clear message for retry logic
       */
      
      // Mock fetch to simulate API failures
      const originalFetch = global.fetch;
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const config: Config['llm'] = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        prompts: {
          terse: 'Be terse',
          brief: 'Be brief',
          normal: 'Be normal'
        }
      };

      const client = new LLMClient(config);
      
      // Test various API failure scenarios
      const failureScenarios = [
        { status: 429, statusText: 'Too Many Requests', message: 'OpenAI API error: 429 Too Many Requests' },
        { status: 500, statusText: 'Internal Server Error', message: 'OpenAI API error: 500 Internal Server Error' },
        { status: 503, statusText: 'Service Unavailable', message: 'OpenAI API error: 503 Service Unavailable' },
        { status: 408, statusText: 'Request Timeout', message: 'OpenAI API error: 408 Request Timeout' }
      ];

      for (const scenario of failureScenarios) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: scenario.status,
          statusText: scenario.statusText
        });

        // Error should bubble up with clear message
        await expect(
          client.summarize('Test text', 'terse', 'project')
        ).rejects.toThrow(scenario.message);
        
        // Verify API was called
        expect(mockFetch).toHaveBeenCalled();
      }

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle Ollama connection failures gracefully', async () => {
      /**
       * FAILURE: Local Ollama server unavailable
       * GRACEFUL: Clear error for user to start Ollama
       */
      const originalFetch = global.fetch;
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const config: Config['llm'] = {
        provider: 'ollama',
        model: 'llama2',
        endpoint: 'http://localhost:11434/api/generate',
        prompts: {
          terse: 'Be terse',
          brief: 'Be brief',
          normal: 'Be normal'
        }
      };

      const client = new LLMClient(config);

      // Simulate connection refused (Ollama not running)
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      await expect(
        client.summarize('Test', 'terse', 'project')
      ).rejects.toThrow('fetch failed');

      global.fetch = originalFetch;
    });
  });

  describe('FAILURE: Malformed API response', () => {
    it('should handle missing fields in OpenAI response', async () => {
      /**
       * FAILURE: API returns unexpected JSON structure
       * GRACEFUL: Handle missing fields without crash
       */
      const originalFetch = global.fetch;
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const config: Config['llm'] = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        prompts: {
          terse: 'Be terse',
          brief: 'Be brief',
          normal: 'Be normal'
        }
      };

      const client = new LLMClient(config);

      // Test various malformed responses that the provider handles
      const malformedResponses = [
        { json: { choices: [] }, expectedResult: [''] },  // Empty choices array
        { json: { choices: [{ message: { content: null } }] }, expectedResult: [''] },  // Null content
        { json: { choices: [{ message: { content: '' } }] }, expectedResult: [''] },  // Empty content
        { json: { choices: [{ message: { content: undefined } }] }, expectedResult: [''] },  // Undefined content
      ];

      for (const testCase of malformedResponses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => testCase.json
        });

        // Should handle gracefully and return empty string
        const result = await client.summarize('Test', 'terse', 'project');
        expect(result).toEqual(testCase.expectedResult);
      }

      // Test valid response for comparison
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ 
            message: { 
              content: 'This is a summary. It has two sentences.' 
            }
          }]
        })
      });

      const validResult = await client.summarize('Test', 'terse', 'project');
      expect(validResult).toEqual(['This is a summary.', 'It has two sentences.']);

      // Test response that would cause a crash without proper handling
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})  // Completely malformed - no choices array
      });

      // This should result in an empty string due to the || '' fallback
      const malformedResult = await client.summarize('Test', 'terse', 'project');
      expect(malformedResult).toEqual(['']);

      global.fetch = originalFetch;
    });

    it('should handle malformed Ollama responses', async () => {
      /**
       * FAILURE: Ollama returns unexpected format
       * GRACEFUL: Handle missing response field
       */
      const originalFetch = global.fetch;
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const config: Config['llm'] = {
        provider: 'ollama',
        model: 'llama2',
        prompts: {
          terse: 'Be terse',
          brief: 'Be brief',
          normal: 'Be normal'
        }
      };

      const client = new LLMClient(config);

      const malformedOllamaResponses = [
        { json: {}, expectedResult: [''] },  // Missing response field
        { json: { response: null }, expectedResult: [''] },  // Null response
        { json: { response: '' }, expectedResult: [''] },  // Empty response
        { json: { error: 'Model not found' }, expectedResult: [''] },  // Error field instead
      ];

      for (const testCase of malformedOllamaResponses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => testCase.json
        });

        const result = await client.summarize('Test', 'terse', 'project');
        expect(result).toEqual(testCase.expectedResult);
      }

      global.fetch = originalFetch;
    });

    it('should handle sentence splitting edge cases', async () => {
      /**
       * FAILURE: LLM returns text without proper punctuation
       * GRACEFUL: Return whole text as single sentence
       */
      const originalFetch = global.fetch;
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const config: Config['llm'] = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        prompts: { terse: 'T', brief: 'B', normal: 'N' }
      };

      const client = new LLMClient(config);

      const edgeCases = [
        { 
          response: 'No punctuation here', 
          expected: ['No punctuation here'] 
        },
        { 
          response: 'Multiple... dots... everywhere...', 
          expected: ['Multiple...', 'dots...', 'everywhere...'] 
        },
        { 
          response: 'Question? Answer! Statement.', 
          expected: ['Question?', 'Answer!', 'Statement.'] 
        },
        { 
          response: '   Spaces around.   More text!   ', 
          expected: ['Spaces around.', 'More text!'] 
        }
      ];

      for (const testCase of edgeCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: testCase.response } }]
          })
        });

        const result = await client.summarize('Test', 'terse', 'project');
        expect(result).toEqual(testCase.expected);
      }

      global.fetch = originalFetch;
    });
  });
});