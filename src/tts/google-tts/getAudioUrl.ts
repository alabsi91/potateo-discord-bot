import url from 'url';

import { splitLongText } from '../../utils.js';
import assertInputTypes from './assertInputTypes.js';

interface Option {
  lang?: string;
  slow?: boolean;
  host?: string;
}

/** Generate "Google TTS" audio URL */
export const getAudioUrl = (
  text: string,
  { lang = 'en', slow = false, host = 'https://translate.google.com' }: Option = {},
): string => {
  assertInputTypes(text, lang, slow, host);

  if (text.length > 200) {
    throw new RangeError(
      `text length (${text.length}) should be less than 200 characters. Try "getAllAudioUrls(text, [option])" for long text.`,
    );
  }

  return (
    host +
    '/translate_tts' +
    url.format({
      query: {
        ie: 'UTF-8',
        q: text,
        tl: lang,
        total: 1,
        idx: 0,
        textlen: text.length,
        client: 'tw-ob',
        prev: 'input',
        ttsspeed: slow ? 0.24 : 1,
      },
    })
  );
};

interface LongTextOption extends Option {
  splitPunct?: string;
}

/** Split the long text into multiple short text and generate audio URL list */
export const getAllAudioUrls = (
  text: string,
  { lang = 'en', slow = false, host = 'https://translate.google.com', splitPunct = '' }: LongTextOption = {},
): { shortText: string; url: string }[] => {
  assertInputTypes(text, lang, slow, host);

  if (typeof splitPunct !== 'string') {
    throw new TypeError('splitPunct should be a string');
  }

  return splitLongText(text, { splitPunctuation: splitPunct }).map(shortText => ({
    shortText,
    url: getAudioUrl(shortText, { lang, slow, host }),
  }));
};
