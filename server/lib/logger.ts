import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private logsDir = '/tmp/logs';
  private appName = 'zesiai-website-app';
  private currentDate = '';
  private logFilePath = '';

  constructor() {
    this.ensureLogsDirectory();
    this.updateLogFilePath();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      try {
        fs.mkdirSync(this.logsDir, { recursive: true, mode: 0o755 });
      } catch (error) {
        console.error(`Failed to create logs directory: ${error}`);
      }
    }
  }

  /**
   * 更新日志文件路径（支持日期滚动）
   */
  private updateLogFilePath(): void {
    const today = this.getFormattedDate();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFilePath = path.join(this.logsDir, `${this.appName}-${today}.log`);
    }
  }

  /**
   * 获取格式化的日期 (YYYY-MM-DD)
   */
  private getFormattedDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * 获取格式化的时间戳 (YYYY-MM-DD HH:mm:ss.SSS)
   */
  private getFormattedTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 23);
  }

  /**
   * 格式化日志消息
   */
  private formatLogMessage(level: LogLevel, module: string, message: string): string {
    return `[${this.getFormattedTimestamp()}] [${level}] [${module}] ${message}`;
  }

  /**
   * 写入日志到文件
   */
  private writeToFile(logMessage: string, stackTrace?: string): void {
    try {
      this.updateLogFilePath();
      let content = logMessage + '\n';
      if (stackTrace) {
        content += stackTrace + '\n';
      }
      fs.appendFileSync(this.logFilePath, content, 'utf-8');
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }

  /**
   * 记录INFO级别日志
   */
  info(module: string, message: string): void {
    const logMessage = this.formatLogMessage('INFO', module, message);
    console.log(logMessage);
    this.writeToFile(logMessage);
  }

  /**
   * 记录WARN级别日志
   */
  warn(module: string, message: string): void {
    const logMessage = this.formatLogMessage('WARN', module, message);
    console.warn(logMessage);
    this.writeToFile(logMessage);
  }

  /**
   * 记录ERROR级别日志
   */
  error(module: string, message: string, error?: Error | any): void {
    const logMessage = this.formatLogMessage('ERROR', module, message);
    console.error(logMessage);
    
    let stackTrace = '';
    if (error) {
      if (error instanceof Error) {
        stackTrace = `Stack trace: ${error.stack}`;
      } else if (typeof error === 'object') {
        stackTrace = `Error details: ${JSON.stringify(error, null, 2)}`;
      } else {
        stackTrace = `Error: ${String(error)}`;
      }
    }
    
    this.writeToFile(logMessage, stackTrace);
  }

  errorJson(payload: Record<string, unknown>): void {
    const logMessage = JSON.stringify(payload);
    console.error(logMessage);
    this.writeToFile(logMessage);
  }

  /**
   * 获取当前日志文件路径
   */
  getCurrentLogFile(): string {
    this.updateLogFilePath();
    return this.logFilePath;
  }
}

// 导出单例
export const logger = new Logger();
