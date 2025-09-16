#!/usr/bin/env bun
// Main CLI entry point for clarvis - Claude Code voice assistant
// Processes hook events through complete pipeline: Hook → Config → Transcript → LLM → Speaker

import { parseHookInput } from './hookParser.js';
import { loadConfig } from './config.js';
import { extractLastAssistantMessage } from './transcript.js';
import { LLMClient } from './llm.js';
import { Speaker } from './speaker.js';

async function main() {
  try {
    // Check if voice is disabled via environment variable
    if (process.env.CLARVIS_VOICE === 'off') {
      process.exit(0);
    }

    // Parse hook input from stdin
    const hook = await parseHookInput();
    if (!hook || hook.stop_hook_active) {
      process.exit(0);
    }
    
    // Load config - errors bubble up for handling
    const config = loadConfig();
    
    // Extract message and metadata from transcript
    const { text, metadata } = await extractLastAssistantMessage(hook.transcript_path);
    if (!text) {
      process.exit(0);
    }
    
    // Determine mode from metadata or default to terse
    const mode = metadata?.mode || 'default';
    const project = metadata?.project || 'unknown';
    
    // Get mode configuration - throw if neither mode nor default exists
    const modeConfig = config.modes[mode] || config.modes.default;
    if (!modeConfig) {
      throw new Error(`No configuration found for mode '${mode}' and no default mode configured`);
    }
    
    // Silent mode check - exit early before any API calls
    if (modeConfig.style === 'silent') {
      process.exit(0);
    }
    
    // Process through LLM if needed
    const llm = new LLMClient(config.llm);
    const sentences = await llm.summarize(text, modeConfig.style, project, mode);
    
    // Speak the sentences - require voice config, error bubbles up if missing
    if (!config.voice) {
      throw new Error('Voice configuration missing from config.toml');
    }
    
    // Validate ElevenLabs configuration
    if (config.voice.provider === 'elevenlabs' && !config.voice.api_key) {
      throw new Error('ElevenLabs API key required when using elevenlabs provider');
    }
    
    const speaker = new Speaker(config.voice);
    await speaker.speak(sentences, modeConfig.style, modeConfig.cache);
    
    process.exit(0);
    
  } catch (error) {
    // Log error for debugging (only to stderr, not to user)
    console.error('clarvis error:', error);
    
    // Error handling with generic message - never expose internal details to user
    try {
      // Exception to our no-defaults rule: hardcode system TTS for error fallback
      // Must always work regardless of API keys or config issues
      const speaker = new Speaker({ provider: 'system' });
      await speaker.speak(['Sir, processing failed.'], 'terse');
    } catch {
      // If even the error message fails, exit silently
    }
    process.exit(0);
  }
}

// Top-level error boundary - never let exceptions escape and break Claude Code
main().catch(err => {
  console.error('clarvis error:', err);
  process.exit(0); // Always exit cleanly to not break Claude Code hooks
});