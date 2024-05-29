# Potateo discord bot

## Environment variables

- Using bash

```bash
export TOKEN=YOUR_TOKEN_HERE
export CLIENT_ID=YOUR_CLIENT_ID_HERE
# firebase config
export API_KEY=YOUR_API_KEY_HERE
export AUTH_DOMAIN=YOUR_AUTH_DOMAIN_HERE
export PROJECT_ID=YOUR_PROJECT_ID_HERE
export STORAGE_BUCKET=YOUR_STORAGE_BUCKET_HERE
export MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID_HERE
export APP_ID=YOUR_APP_ID_HERE
```

- Using Powershell

```pwsh
set TOKEN=YOUR_TOKEN_HERE
set CLIENT_ID=YOUR_CLIENT_ID_HERE
# firebase config
set API_KEY=YOUR_API_KEY_HERE
set AUTH_DOMAIN=YOUR_AUTH_DOMAIN_HERE
set PROJECT_ID=YOUR_PROJECT_ID_HERE
set STORAGE_BUCKET=YOUR_STORAGE_BUCKET_HERE
set MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID_HERE
set APP_ID=YOUR_APP_ID_HERE
```

- Using `.env` file

```pwsh
TOKEN=YOUR_TOKEN_HERE;
CLIENT_ID=YOUR_CLIENT_ID_HERE;
# firebase config
API_KEY=YOUR_API_KEY_HERE
AUTH_DOMAIN=YOUR_AUTH_DOMAIN_HERE
PROJECT_ID=YOUR_PROJECT_ID_HERE
STORAGE_BUCKET=YOUR_STORAGE_BUCKET_HERE
MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID_HERE
APP_ID=YOUR_APP_ID_HERE
```

## Firebase data structure

| Collection | Document |      Data      |
| :--------: | :------: | :------------: |
|   Guilds   | GuildId  | `FirebaseData` |
|    \_\_    |   \_\_   |      \_\_      |
|   Shared   |   bot    | `BotActivity`  |

```ts
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
```

## .config.json

- Relative paths are relative to `index.js` not to `package.json`.

- Note: `.config.json` will be copied to the build folder.

```json
{
  // the default command prefix, can be changed later using slash command
  "prefix": "!",
  "log": {
    // write logs to file
    "enabled": false,
    "level": ["INFO", "WARNING", "ERROR", "SUCCESS"],
    "path": "./bot.log"
  },
  "torrent": {
    "downloadDir": "./assets/downloads",
    "zipDir": "./assets/zips",
    // video extension to lookup after downloading them
    "videoExtensions": ["mp4", "mkv", "avi", "webm", "mov", "flv"]
  },
  "rest": {
    "host": "127.0.0.1",
    "port": 3000,
    "domain": "http://127.0.0.1:3000",
    // do not remove `:fileName` from the routes
    "zip": "/zip/:fileName",
    "streamLink": "/stream/:fileName",
    "downloadLink": "/download/:fileName",
    "browserLink": "/browser/:fileName"
  },
  // temporary file created when generating tts
  "ttsTempFile": "./assets/sounds/say.mp3"
}
```
