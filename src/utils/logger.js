const isDev = import.meta.env.MODE !== 'production';

const noop = () => {};

export const logger = {
  debug: isDev ? console.debug.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  warn: console.warn.bind(console),
  // Prod: message only — full error objects can carry request config (tokens, passwords)
  error: isDev ? console.error.bind(console) : (msg, err) => console.error(msg, err?.message ?? ''),
  log: isDev ? console.log.bind(console) : noop,
};

export default logger;


