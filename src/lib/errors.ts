export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
