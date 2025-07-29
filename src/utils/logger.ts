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

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL 
      ? parseInt(process.env.LOG_LEVEL) 
      : LogLevel.ERROR; // Default to ERROR only for MCP server
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      process.stderr.write(chalk.gray(`[DEBUG] ${message} ${context ? JSON.stringify(context) : ''}\n`));
    }
  }

  info(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      process.stderr.write(chalk.blue(`[INFO] ${message} ${context ? JSON.stringify(context) : ''}\n`));
    }
  }

  warn(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      process.stderr.write(chalk.yellow(`[WARN] ${message} ${context ? JSON.stringify(context) : ''}\n`));
    }
  }

  error(message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      process.stderr.write(chalk.red(`[ERROR] ${message} ${error ? JSON.stringify(error) : ''}\n`));
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

export const logger = Logger.getInstance();
