const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const logFolder = path.resolve(__dirname, '..', config.output.log_folder);

if (!fs.existsSync(logFolder)) {
  fs.mkdirSync(logFolder, { recursive: true });
}

const today = new Date().toISOString().slice(0, 10);
const logFile = path.join(logFolder, `run_${today}.log`);

function timestamp() {
  return new Date().toISOString();
}

function write(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

module.exports = {
  info:  (msg) => write('INFO',  msg),
  warn:  (msg) => write('WARN',  msg),
  error: (msg) => write('ERROR', msg),
  logFile,
};
