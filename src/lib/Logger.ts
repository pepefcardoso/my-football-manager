export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const isProduction = process.env.NODE_ENV === "production";

const CONFIG = {
  minLevel: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
  useColors: true,
};

const COLORS = {
  DEBUG: "color: #94a3b8; font-weight: normal;",
  INFO: "color: #34d399; font-weight: bold;",
  WARN: "color: #fbbf24; font-weight: bold;",
  ERROR: "color: #f87171; font-weight: bold;",
  CONTEXT: "color: #60a5fa; font-weight: bold;",
  DATE: "color: #64748b;",
};

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private print(level: LogLevel, message: string, data?: any) {
    if (level < CONFIG.minLevel) return;

    const timestamp = new Date().toLocaleTimeString("pt-PT", { hour12: false });
    const levelLabel = LogLevel[level].padEnd(5, " ");

    let style = COLORS.DEBUG;
    if (level === LogLevel.INFO) style = COLORS.INFO;
    if (level === LogLevel.WARN) style = COLORS.WARN;
    if (level === LogLevel.ERROR) style = COLORS.ERROR;

    const prefix = `%c[${timestamp}] %c[${levelLabel}] %c[${this.context}]%c`;
    const prefixStyles = [
      COLORS.DATE,
      style,
      COLORS.CONTEXT,
      "color: inherit;",
    ];

    const consoleMethod =
      level === LogLevel.ERROR
        ? console.error
        : level === LogLevel.WARN
        ? console.warn
        : console.log;

    if (data !== undefined) {
      consoleMethod(prefix, ...prefixStyles, message, data);
    } else {
      consoleMethod(prefix, ...prefixStyles, message);
    }
  }

  public debug(message: string, data?: any): void {
    this.print(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: any): void {
    this.print(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.print(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: any): void {
    this.print(LogLevel.ERROR, message, error);
  }
}

export const globalLogger = new Logger("App");
