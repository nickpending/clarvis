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

  async summarize(text: string, prompt: string, topic: string, context: string): Promise<string> {
    // Use appropriate label based on context
    const label = context === 'development' ? 'Project' : 'Topic';

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

  async summarize(text: string, prompt: string, topic: string, context: string): Promise<string> {
    // Use appropriate label based on context
    const label = context === 'development' ? 'Project' : 'Topic';
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

  async summarize(
    text: string,
    style: string,
    context: string,
    intent: string,
    project?: string
  ): Promise<string[]> {
    // Bypass style passes through unchanged (raw option)
    if (style === 'bypass') {
      return [text];
    }

    // Get appropriate prompt from config
    const promptKey = style as keyof typeof this.prompts;
    const prompt = this.prompts[promptKey];

    if (!prompt) {
      throw new Error(`No prompt configured for style: ${style}`);
    }

    // Add explicit intent instruction to base prompt
    const intentInstruction = `\n\nCONTEXT: ${context}\nINTENT: ${intent}\nPROJECT: ${project || 'none'}\n\nUse the explicit INTENT provided above - do not infer intent from the message content.`;

    // Combine base instruction with intent hint and style prompt
    const fullPrompt = this.baseInstruction
      ? `${this.baseInstruction}${intentInstruction}\n\n${prompt}`
      : `${intentInstruction}\n\n${prompt}`;

    try {
      // Log which style is being used
      const { logger } = await import('./logger.js');
      logger.info('llm', `Using style: ${style}`, { context, intent, project });

      // Call provider to get summary
      const projectRef = project || 'general';
      const summary = await this.provider.summarize(text, fullPrompt, projectRef, context);

      // Log raw LLM output for debugging
      logger.debug('llm', 'Raw LLM output', { summary, length: summary.length });

      // Split into sentences for TTS processing using native Intl.Segmenter
      // This properly handles abbreviations, internationalization, and complex sentence boundaries
      const sentences = this.splitIntoSentences(summary);
      logger.debug('llm', `Split into ${sentences.length} sentences`, { sentences });

      return sentences.map(s => s.trim());

    } catch (error) {
      // Let errors bubble up to main error handler
      throw error;
    }
  }

  /**
   * Split text into sentences using native Intl.Segmenter API.
   * This properly handles abbreviations, internationalization, and complex sentence boundaries.
   */
  private splitIntoSentences(text: string): string[] {
    // If text is very short, return as is
    if (text.length < 10) {
      return [text];
    }

    try {
      // Use Intl.Segmenter for proper sentence boundary detection
      const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
      const segments = Array.from(segmenter.segment(text));

      // Extract the text from each segment and filter out empty ones
      const sentences = segments
        .map(segment => segment.segment.trim())
        .filter(sentence => sentence.length > 0);

      return sentences.length > 0 ? sentences : [text];
    } catch (error) {
      // Fallback to original text if Intl.Segmenter fails
      return [text];
    }
  }
}