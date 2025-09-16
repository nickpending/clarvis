// XDG-compliant configuration loading for clarvis
// Loads from ~/.config/clarvis/config.toml - errors bubble up for graceful handling

import { parse } from '@iarna/toml';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Config } from './types.js';

export function loadConfig(): Config {
  // XDG base directory spec compliance
  // Check XDG_CONFIG_HOME first, then fall back to ~/.config
  const configPath = process.env.XDG_CONFIG_HOME 
    ? join(process.env.XDG_CONFIG_HOME, 'clarvis/config.toml')
    : join(homedir(), '.config/clarvis/config.toml');
  
  // Read and parse config - let errors bubble up to main clarvis error handler
  const content = readFileSync(configPath, 'utf-8');
  return parse(content) as unknown as Config;
}