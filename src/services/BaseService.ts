import { Logger } from "../lib/Logger";
import type { IRepositoryContainer } from "../repositories/IRepositories";
import { Result, ServiceErrorType } from "../domain/ServiceResults";
import type { ServiceResult } from "../domain/ServiceResults";

export interface ServiceConfig {
  enableValidation?: boolean;
  enableLogging?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

export interface ExecutionContext<TInput = any> {
  input: TInput;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly repos: IRepositoryContainer;
  protected readonly config: ServiceConfig;

  constructor(
    repositories: IRepositoryContainer,
    serviceName: string,
    config?: ServiceConfig
  ) {
    this.repos = repositories;
    this.logger = new Logger(serviceName);
    this.config = {
      enableValidation: true,
      enableLogging: true,
      logLevel: "info",
      ...config,
    };
  }

  protected async execute<TInput, TOutput>(
    operation: string,
    input: TInput,
    executor: (input: TInput) => Promise<TOutput>,
    options?: {
      skipValidation?: boolean;
      skipHooks?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<ServiceResult<TOutput>> {
    const context: ExecutionContext<TInput> = {
      input,
      timestamp: new Date(),
      metadata: options?.metadata,
    };

    try {
      if (this.config.enableLogging) {
        this.logger.debug(`Iniciando operação: ${operation}`, {
          input,
          metadata: options?.metadata,
        });
      }

      if (!options?.skipValidation && this.config.enableValidation) {
        const validationResult = await this.preValidate(context);
        if (!validationResult.isValid) {
          return Result.validation(
            validationResult.errors?.join(", ") || "Validação falhou"
          );
        }
      }

      if (!options?.skipHooks) {
        await this.beforeExecute(context);
      }

      const result = await executor(input);

      if (!options?.skipHooks) {
        await this.afterExecute(context, result);
      }

      if (this.config.enableLogging) {
        this.logger.info(`Operação concluída com sucesso: ${operation}`);
      }

      return Result.success(result, `${operation} executado com sucesso`);
    } catch (error) {
      return this.handleError(operation, error, context);
    }
  }

  protected async executeVoid<TInput>(
    operation: string,
    input: TInput,
    executor: (input: TInput) => Promise<void>,
    options?: {
      skipValidation?: boolean;
      skipHooks?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<ServiceResult<void>> {
    return this.execute(operation, input, executor, options);
  }

  protected async preValidate<TInput>(
    _context: ExecutionContext<TInput>
  ): Promise<ValidationResult> {
    return { isValid: true };
  }

  protected async beforeExecute<TInput>(
    _context: ExecutionContext<TInput>
  ): Promise<void> {}

  protected async afterExecute<TInput, TOutput>(
    _context: ExecutionContext<TInput>,
    _result: TOutput
  ): Promise<void> {}

  protected handleError<TInput>(
    operation: string,
    error: unknown,
    context: ExecutionContext<TInput>
  ): ServiceResult<never> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(`Erro na operação ${operation}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });

    if ((error as { code?: string }).code === "SQLITE_CONSTRAINT") {
      return Result.businessRule(
        "Operação violou restrições de integridade do banco de dados"
      );
    }

    if ((error as { code?: string }).code === "NOT_FOUND") {
      return Result.notFound("Entidade");
    }

    return Result.fail(
      `Erro ao executar ${operation}: ${errorMessage}`,
      ServiceErrorType.INTERNAL,
      { originalError: error }
    );
  }

  protected async withTransaction<T>(executor: () => Promise<T>): Promise<T> {
    return executor();
  }

  protected validateRequired(
    value: unknown,
    fieldName: string
  ): ValidationResult {
    if (value === null || value === undefined || value === "") {
      return {
        isValid: false,
        errors: [`${fieldName} é obrigatório`],
      };
    }
    return { isValid: true };
  }

  protected validatePositive(
    value: number,
    fieldName: string
  ): ValidationResult {
    if (value <= 0) {
      return {
        isValid: false,
        errors: [`${fieldName} deve ser maior que zero`],
      };
    }
    return { isValid: true };
  }

  protected validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): ValidationResult {
    if (value < min || value > max) {
      return {
        isValid: false,
        errors: [`${fieldName} deve estar entre ${min} e ${max}`],
      };
    }
    return { isValid: true };
  }

  protected combineValidations(
    ...results: ValidationResult[]
  ): ValidationResult {
    const errors: string[] = [];
    let isValid = true;

    for (const result of results) {
      if (!result.isValid) {
        isValid = false;
        if (result.errors) {
          errors.push(...result.errors);
        }
      }
    }

    return { isValid, errors: errors.length > 0 ? errors : undefined };
  }
}
