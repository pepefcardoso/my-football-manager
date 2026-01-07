import { Timestamp } from "../models/types";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  id: string;
  timestamp: Timestamp;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private isEnabled = true;

  private log(level: LogLevel, context: string, message: string, data?: any) {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      context,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    this.printToConsole(entry);
  }

  public debug(context: string, message: string, data?: any) {
    this.log("DEBUG", context, message, data);
  }

  public info(context: string, message: string, data?: any) {
    this.log("INFO", context, message, data);
  }

  public warn(context: string, message: string, data?: any) {
    this.log("WARN", context, message, data);
  }

  public error(context: string, message: string, data?: any) {
    this.log("ERROR", context, message, data);
  }

  public time<T>(context: string, operation: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.info(context, `${operation} concluído`, {
        duration: `${duration.toFixed(2)}ms`,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(
        context,
        `${operation} falhou após ${duration.toFixed(2)}ms`,
        error
      );
      throw error;
    }
  }

  public async timeAsync<T>(
    context: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.info(context, `${operation} concluído`, {
        duration: `${duration.toFixed(2)}ms`,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(
        context,
        `${operation} falhou após ${duration.toFixed(2)}ms`,
        error
      );
      throw error;
    }
  }

  public getHistory(): LogEntry[] {
    return [...this.logs];
  }

  private printToConsole(entry: LogEntry) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${time}] [${entry.context}]`;

    const styles = {
      DEBUG: "color: #9ca3af",
      INFO: "color: #3b82f6; font-weight: bold",
      WARN: "color: #f59e0b; font-weight: bold",
      ERROR:
        "color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 4px; rounded: 2px",
    };

    const style = styles[entry.level];

    const dataOutput = entry.data ? entry.data : "";

    console.log(`%c${prefix} ${entry.message}`, style, dataOutput);
  }
}

export const logger = new LoggerService();
