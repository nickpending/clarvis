// Metadata extraction for clarvis hook processing
// Parses clarvis:[mode:X project:Y] format from Claude messages

import { ClarvisMetadata } from './types.js';

export function extractMetadata(message: string): ClarvisMetadata | null {
  // Look for clarvis:[mode:X project:Y] format anywhere in message
  // Format: clarvis:[mode:dev project:clarvis]
  const match = message.match(/clarvis:\[mode:(\w+)\s+project:([\w-]+)\]/);
  
  if (!match) {
    return null;
  }
  
  const mode = match[1];
  const project = match[2];
  
  if (!mode || !project) {
    return null;
  }
  
  // Validate mode is one of the expected values
  const validModes: ClarvisMetadata['mode'][] = ['default', 'development', 'writing', 'research', 'conversation'];
  if (!validModes.includes(mode as ClarvisMetadata['mode'])) {
    return null;
  }
  
  return {
    mode: mode as ClarvisMetadata['mode'],
    project
  };
}