export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TENANT_ACCESS_DENIED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_SUSPENDED'
  | 'PAYMENT_FAILED'
  | 'DUPLICATE_WEBHOOK'
  | 'TRANSACTION_FAILED'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errors = {
  validation: (message = 'Validation failed', details?: unknown) =>
    new AppError(message, 400, 'VALIDATION_ERROR', details),
  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'You are not authorized to access this resource.') =>
    new AppError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND'),
  tenantDenied: (message = 'Cross-tenant access is not allowed.') =>
    new AppError(message, 403, 'TENANT_ACCESS_DENIED'),
  invalidCredentials: (message = 'Invalid email or password') =>
    new AppError(message, 401, 'INVALID_CREDENTIALS'),
  suspended: (message = 'This organization account is suspended.') =>
    new AppError(message, 403, 'ACCOUNT_SUSPENDED'),
  paymentFailed: (message = 'Payment failed') => new AppError(message, 402, 'PAYMENT_FAILED'),
  conflict: (message = 'Conflict') => new AppError(message, 409, 'CONFLICT'),
  rateLimited: (message = 'Too many requests. Please try again later.') =>
    new AppError(message, 429, 'RATE_LIMITED'),
  internal: (message = 'Something went wrong') => new AppError(message, 500, 'INTERNAL_ERROR'),
};
