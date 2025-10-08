// XDG-compliant debug logger for clarvis
// Only logs when config.debug.enabled = true

import { appendFileSync, statSync, renameSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private enabled: boolean = false;
  private logPath: string;
  private maxSizeBytes: number;

  constructor() {
    // Default to XDG cache directory
    const cacheDir = process.env.XDG_CACHE_HOME
      ? join(process.env.XDG_CACHE_HOME, 'clarvis')
      : join(homedir(), '.cache/clarvis');

    this.logPath = join(cacheDir, 'debug.log');
    this.maxSizeBytes = 10 * 1024 * 1024; // 10MB default
  }

  configure(config?: { enabled: boolean; log_path?: string; max_size_mb?: number }) {
    if (!config) return;

    this.enabled = config.enabled;

    if (config.log_path) {
      // Expand ~ to home directory
      this.logPath = config.log_path.replace(/^~/, homedir());
    }

    if (config.max_size_mb) {
      this.maxSizeBytes = config.max_size_mb * 1024 * 1024;
    }

    // Ensure log directory exists if logging enabled
    if (this.enabled) {
      const dir = dirname(this.logPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  private log(level: LogLevel, component: string, message: string, data?: any) {
    if (!this.enabled) return;

    try {
      // Check file size and rotate if needed
      if (existsSync(this.logPath)) {
        const stats = statSync(this.logPath);
        if (stats.size >= this.maxSizeBytes) {
          // Rotate: debug.log -> debug.log.1
          const rotatedPath = `${this.logPath}.1`;
          if (existsSync(rotatedPath)) {
            // Remove old rotation
            renameSync(rotatedPath, `${this.logPath}.old`);
          }
          renameSync(this.logPath, rotatedPath);
        }
      }

      // Format: [timestamp] [LEVEL] [component] message
      const timestamp = new Date().toISOString();
      const logLine = data
        ? `[${timestamp}] [${level}] [${component}] ${message} ${JSON.stringify(data)}\n`
        : `[${timestamp}] [${level}] [${component}] ${message}\n`;

      appendFileSync(this.logPath, logLine, 'utf-8');
    } catch (error) {
      // Silently fail - logging errors shouldn't break the app
    }
  }

  debug(component: string, message: string, data?: any) {
    this.log('DEBUG', component, message, data);
  }

  info(component: string, message: string, data?: any) {
    this.log('INFO', component, message, data);
  }

  warn(component: string, message: string, data?: any) {
    this.log('WARN', component, message, data);
  }

  error(component: string, message: string, data?: any) {
    this.log('ERROR', component, message, data);
  }
}

// Singleton instance
export const logger = new Logger();
