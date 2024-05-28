import type {
  SlashCommandBuilder,
  Collection,
  PermissionResolvable,
  Message,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  ActivityType,
} from 'discord.js';

export interface SlashCommand {
  command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => void;
  autocomplete?: (interaction: AutocompleteInteraction) => void;
  cooldown?: number; // in seconds
}

export interface Command {
  name: string;
  execute: (message: Message, args: Array<string>) => void;
  permissions: Array<PermissionResolvable>;
  aliases: Array<string>;
  cooldown?: number;
}

interface GuildOptions {
  prefix: string;
}

export type GuildOption = keyof GuildOptions;

export interface BotEvent<Event extends keyof ClientEvents = keyof ClientEvents> {
  name: Event;
  once?: boolean | false;
  execute: (...args: ClientEvents[Event]) => void;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      CLIENT_ID: string;
      API_KEY: string;
      AUTH_DOMAIN: string;
      PROJECT_ID: string;
      STORAGE_BUCKET: string;
      MESSAGING_SENDER_ID: string;
      APP_ID: string;
    }
  }
}

declare module 'path' {
  interface PlatformPath {
    /** Always returns the project root directory full path */
    projectRoot: string;

    /** Returns index.js directory full path */
    scriptPath: string;

    /**
     * If relative returns the full path relative to scriptPath.
     * If absolute returns it as it is.
     * Creates folders if not exists
     */
    prepare(configPath: string): string;
  }
}

declare module 'discord.js' {
  export interface Client {
    slashCommands: Collection<string, SlashCommand>;
    commands: Collection<string, Command>;
    cooldowns: Collection<string, number>;
  }
}

type ActivityUnionType = Exclude<keyof typeof ActivityType, 'Custom'>;
type BotActivity = {
  activity: string;
  type: ActivityUnionType;
};

type CustomCommands = {
  when: string;
  say: string;
};

type VoiceWelcomeMessage = {
  id: string;
  message: string;
  lang: Languages;
};

type FirebaseData = {
  voiceMessages: VoiceWelcomeMessage[];
  customCommands: CustomCommands[];
  savedList: string[];
  prefix: string;
};

type FirebaseCache = Record<string, FirebaseData>;

type Meme = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
  captions: number;
};

type MemeResponse = {
  success: boolean;
  data: { memes: Meme[] };
};

type Torrent = {
  url: string;
  hash: string;
  quality: string;
  type: string;
  is_repack: string;
  video_codec: string;
  bit_depth: string;
  audio_channels: string;
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded: string;
  date_uploaded_unix: number;
};

type Movie = {
  id: number;
  url: string;
  imdb_code: string;
  title: string;
  title_english: string;
  title_long: string;
  slug: string;
  year: number;
  rating: number;
  runtime: number;
  genres: string[];
  summary: string;
  description_full: string;
  synopsis: string;
  yt_trailer_code: string;
  language: string;
  mpa_rating: string;
  background_image: string;
  background_image_original: string;
  small_cover_image: string;
  medium_cover_image: string;
  large_cover_image: string;
  state: string;
  torrents: Torrent[];
  date_uploaded: string;
  date_uploaded_unix: number;
};

type YtsResponse = {
  status: string;
  status_message: string;
  data: {
    movie_count: number;
    limit: number;
    page_number: number;
    movies: Movie[];
  };
  '@meta': { server_time: 1716834648; server_timezone: 'CET'; api_version: 2; execution_time: '0.01 ms' };
};

type Languages =
  | 'en'
  | 'af-ZA'
  | 'am-ET'
  | 'hy-AM'
  | 'az-AZ'
  | 'id-ID'
  | 'ms-MY'
  | 'bn-BD'
  | 'bn-IN'
  | 'ca-ES'
  | 'cs-CZ'
  | 'da-DK'
  | 'de-DE'
  | 'en-AU'
  | 'en-CA'
  | 'en-GH'
  | 'en-GB'
  | 'en-IN'
  | 'en-IE'
  | 'en-KE'
  | 'en-NZ'
  | 'en-NG'
  | 'en-PH'
  | 'en-SG'
  | 'en-ZA'
  | 'en-TZ'
  | 'en-US'
  | 'es-AR'
  | 'es-BO'
  | 'es-CL'
  | 'es-CO'
  | 'es-CR'
  | 'es-EC'
  | 'es-SV'
  | 'es-ES'
  | 'es-US'
  | 'es-GT'
  | 'es-HN'
  | 'es-MX'
  | 'es-NI'
  | 'es-PA'
  | 'es-PY'
  | 'es-PE'
  | 'es-PR'
  | 'es-DO'
  | 'es-UY'
  | 'es-VE'
  | 'eu-ES'
  | 'fil-PH'
  | 'fr-CA'
  | 'fr-FR'
  | 'gl-ES'
  | 'ka-GE'
  | 'gu-IN'
  | 'hr-HR'
  | 'zu-ZA'
  | 'is-IS'
  | 'it-IT'
  | 'jv-ID'
  | 'kn-IN'
  | 'km-KH'
  | 'lo-LA'
  | 'lv-LV'
  | 'lt-LT'
  | 'hu-HU'
  | 'ml-IN'
  | 'mr-IN'
  | 'nl-NL'
  | 'ne-NP'
  | 'nb-NO'
  | 'pl-PL'
  | 'pt-BR'
  | 'pt-PT'
  | 'ro-RO'
  | 'si-LK'
  | 'sk-SK'
  | 'sl-SI'
  | 'su-ID'
  | 'sw-TZ'
  | 'sw-KE'
  | 'fi-FI'
  | 'sv-SE'
  | 'ta-IN'
  | 'ta-SG'
  | 'ta-LK'
  | 'ta-MY'
  | 'te-IN'
  | 'vi-VN'
  | 'tr-TR'
  | 'ur-PK'
  | 'ur-IN'
  | 'el-GR'
  | 'bg-BG'
  | 'ru-RU'
  | 'sr-RS'
  | 'uk-UA'
  | 'he-IL'
  | 'ar-IL'
  | 'ar-JO'
  | 'ar-AE'
  | 'ar-BH'
  | 'ar-DZ'
  | 'ar-SA'
  | 'ar-IQ'
  | 'ar-KW'
  | 'ar-MA'
  | 'ar-TN'
  | 'ar-OM'
  | 'ar-PS'
  | 'ar-QA'
  | 'ar-LB'
  | 'ar-EG'
  | 'fa-IR'
  | 'hi-IN'
  | 'th-TH'
  | 'ko-KR'
  | 'zh-TW'
  | 'yue-Hant-HK'
  | 'ja-JP'
  | 'zh-HK'
  | 'zh';
