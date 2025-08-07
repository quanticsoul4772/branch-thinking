import pino from 'pino';
import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private pinoLogger: pino.Logger;
  private useJsonOutput: boolean;

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL 
      ? parseInt(process.env.LOG_LEVEL) 
      : LogLevel.ERROR; // Default to ERROR only for MCP server
    
    this.useJsonOutput = process.env.LOG_FORMAT === 'json';
    
    // Configure pino for structured logging
    this.pinoLogger = pino({
      level: this.mapLogLevel(this.logLevel),
      transport: this.useJsonOutput ? undefined : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    });
  }

  private mapLogLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'debug';
      case LogLevel.INFO: return 'info';
      case LogLevel.WARN: return 'warn';
      case LogLevel.ERROR: return 'error';
      default: return 'error';
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      if (this.useJsonOutput) {
        this.pinoLogger.debug(context, message);
      } else {
        process.stderr.write(chalk.gray(`[DEBUG] ${message} ${context ? JSON.stringify(context) : ''}\n`));
      }
    }
  }

  info(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      if (this.useJsonOutput) {
        this.pinoLogger.info(context, message);
      } else {
        process.stderr.write(chalk.blue(`[INFO] ${message} ${context ? JSON.stringify(context) : ''}\n`));
      }
    }
  }

  warn(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      if (this.useJsonOutput) {
        this.pinoLogger.warn(context, message);
      } else {
        process.stderr.write(chalk.yellow(`[WARN] ${message} ${context ? JSON.stringify(context) : ''}\n`));
      }
    }
  }

  error(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      if (this.useJsonOutput) {
        this.pinoLogger.error(error, message);
      } else {
        process.stderr.write(chalk.red(`[ERROR] ${message} ${error ? JSON.stringify(error) : ''}\n`));
      }
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.pinoLogger.level = this.mapLogLevel(level);
  }
}

export const logger = Logger.getInstance();
