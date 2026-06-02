interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validationService = {
  validatePayload(payload: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];

    if (payload.email && typeof payload.email !== 'string') {
      errors.push('email must be a string');
    }
    if (payload.value && typeof payload.value !== 'number') {
      errors.push('value must be a number');
    }
    if (payload.currency && typeof payload.currency !== 'string') {
      errors.push('currency must be a string');
    }

    return { valid: errors.length === 0, errors };
  },

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        sanitized[key] = value.slice(0, 1000);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },
};
