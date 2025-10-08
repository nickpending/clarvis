// Transcript processing for clarvis hook processing
// Extracts last assistant message from Claude Code transcript JSONL files

import { ClarvisMetadata } from './types.js';
import { extractMetadata } from './metadata.js';

export async function extractLastAssistantMessage(path: string): Promise<{text: string, metadata?: ClarvisMetadata}> {
  try {
    // Use Bun native file API for optimal performance  
    const file = Bun.file(path);
    const content = await file.text();
    
    if (!content.trim()) {
      return { text: '' };
    }
    
    // Split into JSONL entries (each line should be complete JSON)
    // But handle embedded newlines in JSON strings properly
    const lines = content.trim().split('\n');
    const jsonlEntries: string[] = [];
    let currentEntry = '';
    
    // Reconstruct JSONL entries that may have been split by embedded newlines
    for (const line of lines) {
      currentEntry += line;
      try {
        // Try to parse - if it works, it's a complete entry
        JSON.parse(currentEntry);
        jsonlEntries.push(currentEntry);
        currentEntry = '';
      } catch {
        // Not complete yet, add newline back and continue
        currentEntry += '\n';
      }
    }
    
    // Take last 20 entries for performance (like Python version)
    const lastEntries = jsonlEntries.slice(-20);
    
    // Search from most recent to oldest
    for (const jsonEntry of lastEntries.reverse()) {
      try {
        const entry = JSON.parse(jsonEntry);
        
        // Look for assistant messages with text content (Claude Code format)
        const message = entry.message;
        if (message?.role === 'assistant' && message.content) {
          // Find text content in the content array
          for (const contentItem of message.content) {
            if (contentItem.type === 'text' && contentItem.text) {
              const text = contentItem.text;
              
              // Extract metadata using existing function
              const metadata = extractMetadata(text);
              
              // Strip metadata line if present (can be at start or end of message)
              const cleanedText = metadata
                ? text.replace(/(\n\n?)clarvis:\[.*?\]$/g, '')
                : text;
              
              return metadata
                ? { text: cleanedText, metadata }
                : { text: cleanedText };
            }
          }
        }
      } catch {
        // Skip malformed JSON lines gracefully
        continue;
      }
    }
    
    // No assistant message found
    return { text: '' };
    
  } catch {
    // Handle file errors gracefully - missing files, permission issues, etc.
    return { text: '' };
  }
}