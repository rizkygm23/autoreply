const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function ts() {
  return new Date().toISOString();
}

function randId(len = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function logInfo(msg) {
  console.log(`${COLORS.blue}ℹ${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}
function logOk(msg) {
  console.log(`${COLORS.green}✔${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}
function logErr(msg) {
  console.error(`${COLORS.red}✖${COLORS.reset} ${COLORS.dim}[${ts()}]${COLORS.reset} ${msg}`);
}

function startSpinner(prefix, text = "AI thinking") {
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let i = 0;
  const linePrefix = `${COLORS.cyan}${prefix}${COLORS.reset} ${COLORS.dim}${text}...${COLORS.reset} `;
  const interval = setInterval(() => {
    const frame = frames[(i = (i + 1) % frames.length)];
    process.stdout.write(`\r${linePrefix}${COLORS.magenta}${frame}${COLORS.reset}  `);
  }, 80);

  const stop = (ok = true, endText = "done") => {
    clearInterval(interval);
    process.stdout.write("\r\x1b[2K");
    const icon = ok ? `${COLORS.green}✔${COLORS.reset}` : `${COLORS.red}✖${COLORS.reset}`;
    console.log(`${icon} ${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.cyan}${prefix}${COLORS.reset} ${endText}`);
  };

  return { stop };
}

export {
  COLORS,
  randId,
  logInfo,
  logWarn,
  logOk,
  logErr,
  startSpinner,
};

