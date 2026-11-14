export interface RequestJsonError extends Error {
  status?: number;
  data?: unknown;
}

/**
 * Fetches a URL and parses JSON safely without failing on non-JSON error payloads (e.g., HTML 500 pages).
 */
export async function requestJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackError = 'Request failed'
): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  let data: Record<string, unknown> | null = null;
  if (text) {
    const trimmed = text.trim();
    if (
      contentType.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      try {
        data = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    let message = `${fallbackError} (${response.status}${response.statusText ? ` ${response.statusText}` : ''})`;

    if (data && typeof data === 'object') {
      if (Array.isArray(data.issues) && data.issues.length > 0) {
        const issueMessages = data.issues
          .map((issue: unknown) =>
            issue && typeof issue === 'object' && 'message' in issue
              ? String((issue as { message?: unknown }).message || '')
              : ''
          )
          .filter(Boolean)
          .join(', ');
        if (issueMessages) {
          message = `Validation errors: ${issueMessages}`;
        }
      } else if (Array.isArray(data.missingVariables) && data.missingVariables.length > 0) {
        message = `Missing variables: ${data.missingVariables.map(String).join(', ')}`;
      } else if (typeof data.error === 'string' && data.error.trim()) {
        message = data.error;
      } else if (typeof data.message === 'string' && data.message.trim()) {
        message = data.message;
      }
    }

    const err: RequestJsonError = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  if (data === null) {
    if (!text.trim() || text.trim() === 'null') {
      return (text.trim() === 'null' ? null : {}) as T;
    }
    throw new Error('Server returned an unexpected non-JSON response');
  }

  return data as T;
}
