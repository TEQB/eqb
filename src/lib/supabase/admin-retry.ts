/**
 * Utility functions for handling Supabase Auth Admin API calls with retry logic
 * and proper error serialization for logging.
 */

export interface SerializedAuthError {
  message: string | undefined;
  name: string | undefined;
  status: number | undefined;
  cause: string | undefined;
}

/**
 * Serializes an AuthError or AuthRetryableFetchError into a plain object safe for logging.
 * Error properties are non-enumerable, so we extract them explicitly.
 */
export function serializeAuthError(err: unknown): SerializedAuthError {
  if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    
    return {
      message: typeof errorObj.message === 'string' ? errorObj.message : undefined,
      name: typeof errorObj.name === 'string' ? errorObj.name : undefined,
      status: typeof errorObj.status === 'number' ? errorObj.status : undefined,
      cause: typeof errorObj.cause === 'string' ? errorObj.cause : String(errorObj.cause ?? ''),
    };
  }
  
  // Fallback for non-Error objects
  return {
    message: String(err),
    name: undefined,
    status: undefined,
    cause: String(err),
  };
}

/**
 * Checks if an error is a transient Supabase Auth error that should be retried.
 */
export function isTransientAuthError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    
    const name = typeof errorObj.name === 'string' ? errorObj.name : '';
    const status = typeof errorObj.status === 'number' ? errorObj.status : 0;
    
    return (
      name === 'AuthRetryableFetchError' ||
      status === 500 ||
      status === 503
    );
  }
  
  return false;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Wraps a Supabase Auth Admin API call with retry logic for transient errors.
 * Uses exponential backoff (baseDelayMs * attempt) and only retries on transient errors.
 * 
 * @param fn - The async function to call (should return { data, error })
 * @param options - Retry configuration (default: 3 attempts, 2000ms base delay)
 * @returns The final { data, error } result from the last attempt
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withAuthRetry<T extends { data: any; error: any }>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 2000 } = options;

  let lastResult: T | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fn();
    lastResult = result;

    // If no error, return immediately
    if (!result.error) {
      return result;
    }

    // If it's a transient error (status 500 or AuthRetryableFetchError) and we have more attempts, retry with backoff
    const err: unknown = result.error;
    const isTransient =
      err !== null &&
      err !== undefined &&
      typeof err === 'object' &&
      ((typeof (err as Record<string, unknown>).name === 'string' && (err as Record<string, unknown>).name === 'AuthRetryableFetchError') ||
       (typeof (err as Record<string, unknown>).status === 'number' && (err as Record<string, unknown>).status === 500));

    if (isTransient && attempt < maxAttempts) {
      const delay = baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    // Non-transient error or max attempts reached, return the result
    break;
  }

  return lastResult!;
}
