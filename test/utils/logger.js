// Simple logger for tests
export const logger = {
  info: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
  warn: (msg) => console.warn(msg),
  debug: (msg) => process.env.DEBUG && console.debug(msg)
};
