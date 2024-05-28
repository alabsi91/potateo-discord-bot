import axios from 'axios';

import assertInputTypes from './assertInputTypes.js';
import { splitLongText } from '../../utils.js';

interface Option {
  lang?: string;
  slow?: boolean;
  host?: string;
  timeout?: number;
}

/** Get "Google TTS" audio base64 text */
export const getAudioBase64 = async (
  text: string,
  { lang = 'en', slow = false, host = 'https://translate.google.com', timeout = 10000 }: Option = {},
): Promise<string> => {
  assertInputTypes(text, lang, slow, host);

  if (typeof timeout !== 'number' || timeout <= 0) {
    throw new TypeError('timeout should be a positive number');
  }

  if (text.length > 200) {
    throw new RangeError(
      `text length (${text.length}) should be less than 200 characters. Try "getAllAudioBase64(text, [option])" for long text.`,
    );
  }

  const res = await axios({
    method: 'post',
    baseURL: host,
    url: '/_/TranslateWebserverUi/data/batchexecute',
    timeout,
    data:
      'f.req=' +
      encodeURIComponent(
        JSON.stringify([[['jQ1olc', JSON.stringify([text, lang, slow ? true : null, 'null']), null, 'generic']]]),
      ),
  });

  // 1. parse audio base64 string
  let result;
  try {
    result = eval(res.data.slice(5))[0][2];
  } catch (e) {
    throw new Error(`parse response failed:\n${res.data}`);
  }

  // Check the result. The result will be null if given the lang doesn't exist
  if (!result) {
    throw new Error(`lang "${lang}" might not exist`);
  }

  // 2. continue to parse audio base64 string
  try {
    result = eval(result)[0];
  } catch (e) {
    throw new Error(`parse response failed:\n${res.data}`);
  }

  return result;
};

interface LongTextOption extends Option {
  splitPunct?: string;
}

/**
 * @typedef {object} Result
 * @property {string} shortText
 * @property {string} base64
 */

/** Split the long text into multiple short text and generate audio base64 list */
export const getAllAudioBase64 = async (
  text: string,
  { lang = 'en', slow = false, host = 'https://translate.google.com', splitPunct = '', timeout = 10000 }: LongTextOption = {},
): Promise<{ shortText: string; base64: string }[]> => {
  assertInputTypes(text, lang, slow, host);

  if (typeof splitPunct !== 'string') {
    throw new TypeError('splitPunct should be a string');
  }

  if (typeof timeout !== 'number' || timeout <= 0) {
    throw new TypeError('timeout should be a positive number');
  }

  const shortTextList = splitLongText(text, { splitPunctuation: splitPunct });
  const base64List = await Promise.all(shortTextList.map(shortText => getAudioBase64(shortText, { lang, slow, host, timeout })));

  // put short text and base64 text in a list
  const result: { shortText: string; base64: string }[] = [];
  for (let i = 0; i < shortTextList.length; i++) {
    const shortText = shortTextList[i];
    const base64 = base64List[i];
    result.push({ shortText, base64 });
  }

  return result;
};
