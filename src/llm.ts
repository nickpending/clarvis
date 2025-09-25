// LLM client with provider abstraction for clarvis
// Supports OpenAI and Ollama providers via configuration

import { Config } from './types.js';

// Provider abstraction interface
interface LLMProvider {
  summarize(text: string, prompt: string, topic: string, mode: string): Promise<string>;
}

// OpenAI provider implementation
class OpenAIProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private endpoint: string = 'https://api.openai.com/v1/chat/completions'
  ) {
    if (!apiKey) {
      throw new Error('OpenAI provider requires API key in config');
    }
  }

  async summarize(text: string, prompt: string, topic: string, mode: string): Promise<string> {
    // Use appropriate label based on mode
    const label = mode === 'development' ? 'Project' : 'Topic';
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `${label}: ${topic}\n\n${text}` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    };
    
    return data.choices?.[0]?.message?.content || '';
  }
}

// Ollama provider implementation
class OllamaProvider implements LLMProvider {
  constructor(
    private model: string,
    private endpoint: string = 'http://localhost:11434/api/generate'
  ) {}

  async summarize(text: string, prompt: string, topic: string, mode: string): Promise<string> {
    // Use appropriate label based on mode
    const label = mode === 'development' ? 'Project' : 'Topic';
    const fullPrompt = `${prompt}\n\n${label}: ${topic}\n\n${text}`;
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { response?: string };
    return data.response || '';
  }
}

// Main LLM client class that uses provider abstraction
export class LLMClient {
  private provider: LLMProvider;
  private prompts: Config['llm']['prompts'];
  private baseInstruction: string | undefined;

  constructor(config: Config['llm']) {
    // Create appropriate provider based on config
    switch (config.provider) {
      case 'openai':
        this.provider = new OpenAIProvider(
          config.apiKey || '',
          config.model,
          config.endpoint
        );
        break;
      case 'ollama':
        this.provider = new OllamaProvider(
          config.model,
          config.endpoint
        );
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
    
    this.prompts = config.prompts;
    this.baseInstruction = config.base_instruction;
  }

  async summarize(text: string, style: string, project: string, mode: string): Promise<string[]> {
    // Bypass style passes through unchanged (new raw option)
    if (style === 'bypass') {
      return [text];
    }

    // Full style now gets JARVIS treatment (no longer bypasses)

    // Get appropriate prompt from config
    const promptKey = style as keyof typeof this.prompts;
    const prompt = this.prompts[promptKey];
    
    if (!prompt) {
      throw new Error(`No prompt configured for style: ${style}`);
    }

    // Combine base instruction with mode-specific prompt
    const fullPrompt = this.baseInstruction 
      ? `${this.baseInstruction}\n\n${prompt}`
      : prompt;

    try {
      // Call provider to get summary
      const summary = await this.provider.summarize(text, fullPrompt, project, mode);
      
      // Split into sentences for TTS processing
      const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
      return sentences.map(s => s.trim());
      
    } catch (error) {
      // Let errors bubble up to main error handler
      throw error;
    }
  }
}