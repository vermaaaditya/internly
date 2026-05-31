// Rich console logger with clean ANSI colors and timestamp formatting
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m"
};

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  info: (msg) => {
    console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fgCyan}ℹ INFO:${colors.reset} ${msg}`);
  },
  success: (msg) => {
    console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fgGreen}✔ SUCCESS:${colors.reset} ${colors.fgGreen}${colors.bright}${msg}${colors.reset}`);
  },
  warn: (msg) => {
    console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fgYellow}⚠ WARNING:${colors.reset} ${msg}`);
  },
  error: (msg, err = "") => {
    console.error(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fgRed}✖ ERROR:${colors.reset} ${colors.fgRed}${colors.bright}${msg}${colors.reset}`, err ? `\n${err.stack || err}` : '');
  },
  header: (title) => {
    const pad = "=".repeat(Math.max(0, 50 - title.length) / 2);
    console.log(`\n${colors.fgMagenta}${colors.bright}${pad} ${title.toUpperCase()} ${pad}${colors.reset}\n`);
  }
};

module.exports = logger;
