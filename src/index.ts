import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import path from 'path';

import { registerPathExtension } from './utils.js';

import type { Command, SlashCommand } from './types.js';
import { startRestServer } from './rest/rest.js';

// register path extensions
registerPathExtension();

// load .env
config();

const { Guilds, GuildVoiceStates, MessageContent, GuildMessages, GuildMembers } = GatewayIntentBits;
const client = new Client({ intents: [Guilds, GuildVoiceStates, MessageContent, GuildMessages, GuildMembers] });

client.slashCommands = new Collection<string, SlashCommand>();
client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, number>();

const handlersDir = 'handlers';

readdirSync(path.join(path.scriptPath, handlersDir)).forEach(async handler => {
  if (!handler.endsWith('.js')) return;

  const init = (await import(`./${handlersDir}/${handler}`)).default;

  init(client);
});

client.login(process.env.TOKEN);

startRestServer();
