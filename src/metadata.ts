// Metadata extraction for clarvis hook processing
// Parses clarvis:[context:X intent:Y project:Z] format from Claude messages

import { ClarvisMetadata } from './types.js';

export function extractMetadata(message: string): ClarvisMetadata | null {
  // Look for clarvis:[context:X intent:Y project:Z] format anywhere in message
  // Format: clarvis:[context:development intent:completion project:clarvis]
  // Project is optional: clarvis:[context:assistant intent:discussion]

  // Debug: Log the search
  import('./logger.js').then(({ logger }) => {
    logger.debug('metadata', 'Searching for metadata in message', {
      messageLength: message.length,
      messageEnd: message.slice(-100)  // Last 100 chars where metadata should be
    });
  });

  // Find the clarvis metadata block first
  const clarvisMatch = message.match(/clarvis:\[([^\]]+)\]/);
  if (!clarvisMatch) {
    return null;
  }

  // Parse individual fields from the metadata block (supports any ordering)
  const metadataContent = clarvisMatch[1];
  const contextMatch = metadataContent.match(/context:(\w+)/);
  const intentMatch = metadataContent.match(/intent:(\w+)/);
  const projectMatch = metadataContent.match(/project:([\w-]+)/);

  if (!contextMatch || !intentMatch) {
    return null;
  }

  const context = contextMatch[1];
  const intent = intentMatch[1];
  const project = projectMatch?.[1];  // May be undefined

  if (!context || !intent) {
    return null;
  }

  // Validate context is one of the expected values
  const validContexts: ClarvisMetadata['context'][] = ['assistant', 'development', 'exploration', 'writing'];
  if (!validContexts.includes(context as ClarvisMetadata['context'])) {
    return null;
  }

  // Validate intent is one of the expected values
  const validIntents: ClarvisMetadata['intent'][] = ['navigation', 'discussion', 'completion', 'status', 'error'];
  if (!validIntents.includes(intent as ClarvisMetadata['intent'])) {
    return null;
  }

  const metadata: ClarvisMetadata = {
    context: context as ClarvisMetadata['context'],
    intent: intent as ClarvisMetadata['intent'],
    project
  };

  // Log extracted metadata
  import('./logger.js').then(({ logger }) => {
    logger.debug('metadata', 'Extracted metadata', metadata);
  });

  return metadata;
}