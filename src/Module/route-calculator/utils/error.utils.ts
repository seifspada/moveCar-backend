export interface OrsAppError {
  message?: string;
  response?: {
    data?: {
      error?: { message?: string; code?: number };
      message?: string;
    };
    status?: number;
    statusText?: string;
  };
}

export function toOrsError(error: unknown): OrsAppError {
  return error as OrsAppError;
}