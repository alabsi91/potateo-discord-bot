import { ChannelType, type TextChannel } from 'discord.js';
import { existsSync, mkdirSync, readdirSync, realpathSync, statSync } from 'fs';
import path from 'path';

export const pathExtensions = {
  get projectRoot() {
    const scriptPath = realpathSync(process.argv[1]);
    const suffixesToRemove = ['build'];
    const pattern = new RegExp(`(${suffixesToRemove.join('|')})$`);
    return path.dirname(scriptPath).replace(pattern, '');
  },
  get scriptPath() {
    const scriptPath = realpathSync(process.argv[1]);
    return path.dirname(scriptPath);
  },
};

function prepareConfigPath(configPath: string): string {
  const fullPath = path.isAbsolute(configPath) ? configPath : path.join(pathExtensions.scriptPath, configPath);
  const isExists = existsSync(fullPath);
  const isFile = path.extname(fullPath) !== '';

  // create folder if not exists
  if (!isExists) {
    const mkdirPath = isFile ? path.dirname(fullPath) : fullPath;
    mkdirSync(mkdirPath, { recursive: true });
  }

  return fullPath;
}

export function registerPathExtension() {
  // register path extensions
  path.projectRoot = pathExtensions.projectRoot;
  path.scriptPath = pathExtensions.scriptPath;
  path.prepare = prepareConfigPath;
}

export function isTextChannel(channel: unknown): channel is TextChannel {
  if (!channel) return false;
  if (typeof channel !== 'object') return false;
  if (!('type' in channel)) return false;
  return channel.type === ChannelType.GuildText;
}

export function randomNum(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function searchFiles(fileExtension: string, ...directoryPaths: string[]): string[] {
  const getAllFiles = (directoryPath: string, arrayOfFiles: string[] = []) => {
    const files = readdirSync(directoryPath);

    files.forEach(file => {
      const filePath = path.join(directoryPath, '/', file);
      if (statSync(filePath).isDirectory()) {
        getAllFiles(filePath, arrayOfFiles);
      } else if (path.extname(file) === `.${fileExtension}`) {
        arrayOfFiles.push(filePath);
      }
    });

    return arrayOfFiles;
  };

  const allFilePaths: string[] = [];

  directoryPaths.forEach(directoryPath => {
    getAllFiles(directoryPath).forEach(filePath => {
      allFilePaths.push(filePath);
    });
  });

  return allFilePaths;
}

/**
 * - Always end with `/`
 * - Always does not start with `/`
 * - Remove the dynamic part E.g. `/channels/:channelId`
 */
export function formatUrlRoute(url: string) {
  let link = url.split(':')[0];
  link = link.startsWith('/') ? link.slice(1) : link;
  link = link.endsWith('/') ? link : link + '/';
  return link;
}

/**
 * split the long text to short texts
 * Time Complexity: O(n)
 */
export const splitLongText = (text: string, { maxLength = 200, splitPunctuation = '' } = {}): string[] => {
  const DEFAULT_PUNCTUATION_REGEX = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
  const SPACE_REGEX = '\\s\\uFEFF\\xA0';

  const isSpaceOrPunctuation = (s: string, i: number) => {
    const regex = new RegExp('[' + SPACE_REGEX + DEFAULT_PUNCTUATION_REGEX + splitPunctuation + ']');
    return regex.test(s.charAt(i));
  };

  const lastIndexOfSpaceOrPunct = (s: string, left: number, right: number): number => {
    for (let i = right; i >= left; i--) {
      if (isSpaceOrPunctuation(s, i)) return i;
    }
    return -1; // not found
  };

  const result: string[] = [];
  const addResult = (text: string, start: number, end: number) => {
    result.push(text.slice(start, end + 1));
  };

  let start = 0;
  for (;;) {
    // check text's length
    if (text.length - start <= maxLength) {
      addResult(text, start, text.length - 1);
      break; // end of text
    }

    // check whether the word is cut in the middle.
    let end = start + maxLength - 1;
    if (isSpaceOrPunctuation(text, end) || isSpaceOrPunctuation(text, end + 1)) {
      addResult(text, start, end);
      start = end + 1;
      continue;
    }

    // find last index of space
    end = lastIndexOfSpaceOrPunct(text, start, end);
    if (end === -1) {
      const str = text.slice(start, start + maxLength);
      throw new Error(
        'The word is too long to split into a short text:' +
          `\n${str} ...` +
          '\n\nTry the option "splitPunct" to split the text by punctuation.',
      );
    }

    // add result
    addResult(text, start, end);
    start = end + 1;
  }

  return result;
};
