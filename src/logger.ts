import chalk, { type ColorName } from 'chalk';

import config from './.config.json' with { type: 'json' };
import path from 'path';
import { appendFile } from 'fs/promises';

/**
 * - Prints a styled message to the console.
 *
 * @example
 *   Log('Hello World!'); // Prints: | LOG | Hello World! |
 *   Log.info('Hello World!'); // Prints: | INFO | Hello World! |
 *   Log.error('Hello World!'); // Prints: | ERROR | Hello World! |
 *   Log.warn('Hello World!'); // Prints: | WARNING | Hello World! |
 */
export function Log(...messages: unknown[]) {
  console.log(formatLogTitle('LOG', 'white'), ...messages);
}

Log.warn = (...messages: string[]) => {
  const { newlines, afterNewline } = getNewlines(messages);
  console.log(newlines + formatLogTitle('WARNING', 'yellow'), chalk.yellow(afterNewline));
  if (config.log.enabled && config.log.level.includes('WARNING')) logToFile('WARNING', messages.join(' '));
};

Log.success = (...messages: string[]) => {
  const { newlines, afterNewline } = getNewlines(messages);
  console.log(newlines + formatLogTitle('SUCCESS', 'green'), chalk.green(afterNewline));
  if (config.log.enabled && config.log.level.includes('SUCCESS')) logToFile('SUCCESS', messages.join(' '));
};

Log.error = (...messages: string[]) => {
  const { newlines, afterNewline } = getNewlines(messages);
  console.log(newlines + formatLogTitle('ERROR', 'red'), chalk.red(afterNewline));
  if (config.log.enabled && config.log.level.includes('ERROR')) logToFile('ERROR', messages.join(' '));
};

Log.info = (...messages: string[]) => {
  const { newlines, afterNewline } = getNewlines(messages);
  console.log(newlines + formatLogTitle('INFO', 'cyan'), chalk.cyan(afterNewline));
  if (config.log.enabled && config.log.level.includes('INFO')) logToFile('INFO', messages.join(' '));
};

function formatLogTitle(title: string, color: ColorName) {
  title = ' '.repeat(3) + title.padEnd(10);
  return chalk[color]('|') + chalk[color].bold.inverse(title) + chalk[color]('|');
}

function getNewlines(messages: string[]) {
  const message = messages.join(' ');
  const newlineRegex = /^(\s*[\n\r]+)/;
  const match = message.match(newlineRegex);

  const indent = ' '.repeat(16);

  if (match) {
    const newlines = match[0];
    const afterNewline = message.substring(match[0].length).replace(/\n/g, `\n${indent}`);
    return { newlines, afterNewline };
  }

  return { newlines: '', afterNewline: message.replace(/\n/g, `\n${indent}`) };
}

type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

/**
 * Logs a message to a file with a specified log level.
 * @param {LogLevel} level - The log level (e.g., 'INFO', 'WARN', 'ERROR').
 * @param {string} message - The log message.
 */
async function logToFile(level: LogLevel, message: string): Promise<void> {
  const logEntry = `${getFormattedTimestamp()} [${level}]: ${stripAnsiCodes(message)}\n`;

  try {
    await appendFile(path.resolve(config.log.path), logEntry);
  } catch (err) {
    console.error('Failed to write log entry:', err);
  }
}

/**
 * Formats the current date and time in a more readable way.
 * @returns {string} The formatted date and time string.
 */
function getFormattedTimestamp(): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${date} ${time}`;
}

function stripAnsiCodes(str: string) {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  ].join('|');

  const regex = new RegExp(pattern, 'g');

  return str.replace(regex, '');
}
