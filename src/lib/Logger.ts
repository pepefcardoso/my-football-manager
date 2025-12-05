// src/lib/Logger.ts

/**
 * Define a severidade do log.
 * Útil para filtrar o que deve ser exibido em produção vs desenvolvimento.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Configuração do Logger.
 * Em produção, podemos mudar o minLevel para WARN ou ERROR.
 */
const isProduction = process.env.NODE_ENV === 'production';

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

  /**
   * Cria uma instância de Logger para um contexto específico.
   * @param context O nome do serviço, componente ou módulo (ex: 'MatchService')
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Método interno genérico para exibir o log
   */
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

  /**
   * Detalhes de desenvolvimento, fluxos e variáveis.
   * Só aparece se minLevel for DEBUG.
   */
  public debug(message: string, data?: any): void {
    this.print(LogLevel.DEBUG, message, data);
  }

  /**
   * Informações gerais sobre o funcionamento do sistema.
   * Ex: "Partida iniciada", "Usuário logado".
   */
  public info(message: string, data?: any): void {
    this.print(LogLevel.INFO, message, data);
  }

  /**
   * Avisos que não quebram o sistema, mas merecem atenção.
   * Ex: "Tentativa de login falhou", "Recurso não encontrado (404)".
   */
  public warn(message: string, data?: any): void {
    this.print(LogLevel.WARN, message, data);
  }

  /**
   * Erros críticos que precisam de correção.
   * Ex: "Falha na conexão com DB", "Exception não tratada".
   */
  public error(message: string, error?: any): void {
    this.print(LogLevel.ERROR, message, error);
  }
}

export const globalLogger = new Logger("App");
