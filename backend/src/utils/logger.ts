export const logger = {
  info(message: string, data?: unknown) {
    console.log(JSON.stringify({ level: 'info', message, data, timestamp: new Date().toISOString() }));
  },

  error(message: string, error?: unknown) {
    console.error(JSON.stringify({ level: 'error', message, error, timestamp: new Date().toISOString() }));
  },

  warn(message: string, data?: unknown) {
    console.warn(JSON.stringify({ level: 'warn', message, data, timestamp: new Date().toISOString() }));
  },
};
