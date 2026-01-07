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

  public getHistory(): LogEntry[] {
    return [...this.logs];
  }

  private printToConsole(entry: LogEntry) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${time}] [${entry.context}]`;

    switch (entry.level) {
      case "DEBUG":
        console.debug(
          `%c${prefix} ${entry.message}`,
          "color: gray",
          entry.data || ""
        );
        break;
      case "INFO":
        console.info(
          `%c${prefix} ${entry.message}`,
          "color: #3b82f6",
          entry.data || ""
        );
        break;
      case "WARN":
        console.warn(
          `%c${prefix} ${entry.message}`,
          "color: #f59e0b",
          entry.data || ""
        );
        break;
      case "ERROR":
        console.error(
          `%c${prefix} ${entry.message}`,
          "color: #ef4444; font-weight: bold",
          entry.data || ""
        );
        break;
    }
  }
}

export const logger = new LoggerService();
