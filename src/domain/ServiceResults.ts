export enum ServiceErrorType {
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  BUSINESS_RULE = "BUSINESS_RULE",
  INTERNAL = "INTERNAL",
  UNAUTHORIZED = "UNAUTHORIZED",
  CONFLICT = "CONFLICT",
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
  static success<T>(data: T, message?: string): ServiceResult<T> {
    return { success: true, data, message };
  }

  static ok(message?: string): OperationResult {
    return { success: true, data: undefined, message };
  }

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

  static notFound<T>(entityName: string): ServiceResult<T> {
    return Result.fail<T>(
      `${entityName} não encontrado(a).`,
      ServiceErrorType.NOT_FOUND
    );
  }

  static businessRule<T>(message: string): ServiceResult<T> {
    return Result.fail<T>(message, ServiceErrorType.BUSINESS_RULE);
  }

  static validation<T>(message: string, details?: any): ServiceResult<T> {
    return Result.fail<T>(message, ServiceErrorType.VALIDATION, details);
  }

  static conflict<T>(message: string): ServiceResult<T> {
    return Result.fail<T>(message, ServiceErrorType.CONFLICT);
  }

  static unauthorized<T>(message: string = "Não autorizado"): ServiceResult<T> {
    return Result.fail<T>(message, ServiceErrorType.UNAUTHORIZED);
  }

  static isSuccess<T>(result: ServiceResult<T>): result is SuccessResult<T> {
    return result.success === true;
  }

  static isFailure<T>(result: ServiceResult<T>): result is FailureResult {
    return result.success === false;
  }

  static unwrap<T>(result: ServiceResult<T>): T {
    if (Result.isSuccess(result)) {
      return result.data;
    }
    throw new Error(result.error.message);
  }

  static unwrapOr<T>(result: ServiceResult<T>, defaultValue: T): T {
    return Result.isSuccess(result) ? result.data : defaultValue;
  }

  static async fromPromise<T>(
    promise: Promise<T>,
    errorMessage?: string
  ): Promise<ServiceResult<T>> {
    try {
      const data = await promise;
      return Result.success(data);
    } catch (error) {
      const message =
        errorMessage ||
        (error instanceof Error ? error.message : "Erro desconhecido");
      return Result.fail(message, ServiceErrorType.INTERNAL, { error });
    }
  }

  static map<T, U>(
    result: ServiceResult<T>,
    mapper: (data: T) => U
  ): ServiceResult<U> {
    if (Result.isSuccess(result)) {
      return Result.success(mapper(result.data), result.message);
    }
    return result as FailureResult;
  }

  static async mapAsync<T, U>(
    result: ServiceResult<T>,
    mapper: (data: T) => Promise<U>
  ): Promise<ServiceResult<U>> {
    if (Result.isSuccess(result)) {
      try {
        const mapped = await mapper(result.data);
        return Result.success(mapped, result.message);
      } catch (error) {
        return Result.fail(
          error instanceof Error ? error.message : "Erro no mapeamento",
          ServiceErrorType.INTERNAL
        );
      }
    }
    return result as FailureResult;
  }

  static combine<T extends any[]>(
    ...results: { [K in keyof T]: ServiceResult<T[K]> }
  ): ServiceResult<T> {
    const data: any[] = [];
    for (const result of results) {
      if (Result.isFailure(result)) {
        return result as FailureResult;
      }
      data.push((result as SuccessResult<any>).data);
    }
    return Result.success(data as T);
  }
}
