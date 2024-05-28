import fs from 'fs';
import { Stream } from 'stream';

import * as googleTTS from './google-tts/index.js';

import type internal from 'stream';
import type { Languages } from '../types.js';

function base64toBinaryStream(base64Text: string) {
  // Convert base64 stream to binary stream
  const audioBinaryStream = new Stream.Readable();
  audioBinaryStream.push(Buffer.from(base64Text, 'base64'));
  // Indicate end of stream
  audioBinaryStream.push(null);
  return audioBinaryStream;
}

async function downloadFromInfoCallback(stream: internal.PassThrough, text: string, { lang, slow, host, timeout }: Cfg) {
  const base64Audio = await googleTTS.getAudioBase64(text, { lang, slow, host, timeout });
  const audioStream = base64toBinaryStream(base64Audio);
  audioStream.pipe(stream);
}

export function getVoiceStream(
  text: string,
  { lang = 'en', slow = false, host = 'https://translate.google.com', timeout = 10000, splitPunct }: Cfg = {},
) {
  const stream = new Stream.PassThrough();
  downloadFromInfoCallback(stream, text, { lang, slow, host, timeout, splitPunct });
  return stream;
}

type Cfg = {
  lang?: Languages;
  slow?: boolean;
  host?: string;
  timeout?: number;
  splitPunct?: string;
};

export function saveToFile_(
  filePath: string,
  text: string,
  { lang = 'en-GB', slow = false, host, timeout, splitPunct }: Cfg = {},
) {
  const stream = new Stream.PassThrough();
  const writeStream = fs.createWriteStream(filePath);
  downloadFromInfoCallback(stream, text, { lang, slow, host, timeout, splitPunct });
  stream.pipe(writeStream);
  stream.on('end', () => writeStream.close());
}

export async function saveToFile(
  filePath: string,
  text: string,
  { lang = 'en-GB', slow = false, host, timeout, splitPunct }: Cfg = {},
) {
  const stream = new Stream.PassThrough();
  const writeStream = fs.createWriteStream(filePath);

  await downloadFromInfoCallback(stream, text, { lang, slow, host, timeout, splitPunct });

  stream.pipe(writeStream);

  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  // Close the writeStream after the data has been written
  writeStream.end();
}
