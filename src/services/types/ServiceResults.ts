export enum ServiceErrorType {
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  BUSINESS_RULE = "BUSINESS_RULE",
  INTERNAL = "INTERNAL",
  UNAUTHORIZED = "UNAUTHORIZED",
}

export interface ServiceError {
  message: string;
  type: ServiceErrorType;
  details?: Record<string, any>;
}

export interface SuccessResult<T> {
  success: true;
  data: T;
  message?: string;
}

export interface FailureResult {
  success: false;
  error: ServiceError;
}

export type ServiceResult<T> = SuccessResult<T> | FailureResult;

export type OperationResult = ServiceResult<void>;

export class Result {
  /**
   * Retorna um sucesso com dados.
   */
  static success<T>(data: T, message?: string): ServiceResult<T> {
    return { success: true, data, message };
  }

  /**
   * Retorna um sucesso para operações void (sem dados).
   */
  static ok(message?: string): OperationResult {
    return { success: true, data: undefined, message };
  }

  /**
   * Retorna uma falha genérica.
   */
  static fail<T>(
    message: string,
    type: ServiceErrorType = ServiceErrorType.INTERNAL,
    details?: any
  ): ServiceResult<T> {
    return {
      success: false,
      error: { message, type, details },
    };
  }

  /**
   * Helpers específicos para erros comuns
   */
  static notFound<T>(entityName: string): ServiceResult<T> {
    return Result.fail<T>(
      `${entityName} não encontrado(a).`,
      ServiceErrorType.NOT_FOUND
    );
  }

  static businessRule<T>(message: string): ServiceResult<T> {
    return Result.fail<T>(message, ServiceErrorType.BUSINESS_RULE);
  }

  static validation<T>(message: string): ServiceResult<T> {
    return Result.fail<T>(message, ServiceErrorType.VALIDATION);
  }
}
