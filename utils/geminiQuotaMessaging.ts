export const isGeminiQuotaError = (message: string): boolean => {
  return /quota|resource_exhausted|429|rate limit/i.test(message);
};

export const extractRetryDelaySeconds = (message: string): number | null => {
  const retryMatch = message.match(/(?:retry(?:\s+in)?|in\s+about)[^\d]*([\d.]+)\s*(?:s|seconds?)/i);
  if (!retryMatch) {
    return null;
  }

  const retrySeconds = Number.parseFloat(retryMatch[1]);
  return Number.isFinite(retrySeconds) ? retrySeconds : null;
};

export const formatRetryTimeLabel = (retryDelaySeconds: number, now = new Date()): string => {
  const retryAt = new Date(now.getTime() + retryDelaySeconds * 1000);
  return retryAt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const buildGeminiQuotaMessage = (
  message: string,
  options?: {
    context?: string;
    now?: Date;
  }
): string => {
  const retryDelaySeconds = extractRetryDelaySeconds(message);
  const contextPrefix = options?.context ? `${options.context} ` : '';

  if (retryDelaySeconds !== null) {
    const roundedDelaySeconds = Math.max(1, Math.ceil(retryDelaySeconds));
    const retryTimeLabel = formatRetryTimeLabel(retryDelaySeconds, options?.now);
    return `${contextPrefix}Gemini quota is temporarily exhausted. Please try again in about ${roundedDelaySeconds} seconds, around ${retryTimeLabel} local time.`;
  }

  return `${contextPrefix}Gemini quota is temporarily exhausted. Please try again a little later.`;
};