const fs = require('fs');
const path = require('path');
// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
// Create a write stream for logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);
// Logger functions
const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}:`, message, ...args);
    accessLogStream.write(`${new Date().toISOString()} [INFO]: ${message} ${args.join(' ')}\n`);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, message, ...args);
    accessLogStream.write(`${new Date().toISOString()} [ERROR]: ${message} ${args.join(' ')}\n`);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, message, ...args);
    accessLogStream.write(`${new Date().toISOString()} [WARN]: ${message} ${args.join(' ')}\n`);
  }
};
module.exports = logger;