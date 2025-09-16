// Speaker class for TTS output via lspeak CLI
// Handles cache decisions based on mode and sequential speaking

import { $ } from "bun";
import { Config } from "./types.js";

export class Speaker {
  constructor(private voiceConfig: Config['voice']) {}

  /**
   * Speak sentences through lspeak CLI with cache control and voice configuration
   * @param sentences - Array of sentences to speak
   * @param mode - Processing mode (affects cache decision)
   * @param useCache - Optional explicit cache override
   */
  async speak(sentences: string[], mode: string, useCache?: boolean): Promise<void> {
    // Determine cache strategy based on mode
    // Full mode should not cache (unique content each time)
    // Other modes benefit from caching common phrases
    const shouldCache = useCache !== undefined ? useCache : (mode !== 'full');
    
    // Build lspeak command with voice configuration
    const buildCommand = (sentence: string) => {
      const args: string[] = ['lspeak'];
      
      // Add cache control
      if (!shouldCache) {
        args.push('--no-cache');
      }
      
      // Add provider if specified
      if (this.voiceConfig.provider) {
        args.push('--provider', this.voiceConfig.provider);
      }
      
      // Add voice ID if specified (except for system provider - use system default)
      if (this.voiceConfig.voice_id && this.voiceConfig.provider !== 'system') {
        args.push('--voice', this.voiceConfig.voice_id);
      }
      
      // Add cache threshold if specified
      if (this.voiceConfig.cache_threshold !== undefined) {
        args.push('--cache-threshold', this.voiceConfig.cache_threshold.toString());
      }
      
      // Add the sentence
      args.push(sentence);
      
      return args;
    };
    
    // Set environment variables if needed
    const env: Record<string, string> = {};
    if (this.voiceConfig.provider === 'elevenlabs' && this.voiceConfig.api_key) {
      env.ELEVENLABS_API_KEY = this.voiceConfig.api_key;
    }
    
    // Process each sentence sequentially to avoid audio overlap
    for (const sentence of sentences) {
      const commandArgs = buildCommand(sentence);
      await $`${commandArgs}`.env(env);
    }
  }
}