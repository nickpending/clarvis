#!/usr/bin/env bun
// Main CLI entry point for clarvis - Claude Code voice assistant
// Processes hook events through complete pipeline: Hook → Config → Transcript → LLM → Speaker

import { parseHookInput } from './hookParser.js';
import { loadConfig } from './config.js';
import { extractLastAssistantMessage } from './transcript.js';
import { LLMClient } from './llm.js';
import { Speaker } from './speaker.js';
import { logger } from './logger.js';

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

    // Configure logger from config
    logger.configure(config.debug);
    logger.info('clarvis', 'Hook event received', { session: hook.session_id });
    
    // Extract message and metadata from transcript
    const { text, metadata } = await extractLastAssistantMessage(hook.transcript_path);
    if (!text) {
      process.exit(0);
    }

    // Determine context, intent, and project from metadata with defaults
    const context = metadata?.context || 'assistant';
    const intent = metadata?.intent || 'discussion';
    const project = metadata?.project;  // Optional, can be undefined

    // Debug: Log metadata and context determination
    logger.debug('index', 'Context determination', {
      metadata,
      resolvedContext: context,
      resolvedIntent: intent,
      resolvedProject: project
    });

    // Get context configuration - throw if neither context nor default exists
    const contextConfig = config.contexts[context] || config.contexts.assistant;
    if (!contextConfig) {
      throw new Error(`No configuration found for context '${context}' and no assistant context configured`);
    }

    // Silent style check - exit early before any API calls
    if (contextConfig.style === 'silent') {
      process.exit(0);
    }

    // Process through LLM with explicit intent
    const llm = new LLMClient(config.llm);
    const sentences = await llm.summarize(text, contextConfig.style, context, intent, project);
    
    // Speak the sentences - require voice config, error bubbles up if missing
    if (!config.voice) {
      throw new Error('Voice configuration missing from config.toml');
    }
    
    // Validate ElevenLabs configuration
    if (config.voice.provider === 'elevenlabs' && !config.voice.api_key) {
      throw new Error('ElevenLabs API key required when using elevenlabs provider');
    }
    
    const speaker = new Speaker(config.voice);
    await speaker.speak(sentences, contextConfig.style, contextConfig.cache);
    
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