// TypeScript interfaces for clarvis hook processing
// Exact definitions from ITERATION.md

export interface HookEvent {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  stop_hook_active?: boolean;
}

export interface ClarvisMetadata {
  context: 'assistant' | 'development' | 'exploration' | 'writing';
  intent: 'navigation' | 'discussion' | 'completion' | 'status' | 'error';
  project?: string;  // Optional - only present when relevant
}

export interface Config {
  contexts: {
    [key: string]: {
      style: 'silent' | 'terse' | 'brief' | 'normal' | 'full' | 'bypass';
      cache?: boolean;  // Cache configuration per context
    };
  };
  llm: {
    provider: 'openai' | 'ollama';
    apiKey?: string;  // Optional for Ollama
    endpoint?: string;  // Custom endpoint for Ollama or OpenAI
    model: string;  // e.g., 'gpt-4o-mini', 'llama2', etc.
    base_instruction?: string;  // Base JARVIS instruction to prepend to all prompts
    prompts: {
      terse: string;
      brief: string;
      normal: string;
      full?: string;  // Optional for speech formatting without condensing
    };
  };
  voice: {
    provider: 'elevenlabs' | 'system' | string;  // TTS provider (extensible for custom providers)
    voice_id?: string;  // Voice ID (ElevenLabs) or voice name (system)
    api_key?: string;  // API key for ElevenLabs (required when provider = 'elevenlabs')
    cache_threshold?: number;  // Similarity threshold for cache hits (0.0-1.0)
  };
  debug?: {
    enabled: boolean;  // Enable debug logging
    log_path?: string;  // Optional custom log path (defaults to XDG cache)
    max_size_mb?: number;  // Max log file size before rotation (default: 10MB)
  };
}