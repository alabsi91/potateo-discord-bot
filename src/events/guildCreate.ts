import chalk from 'chalk';
import { Events } from 'discord.js';

import { Log } from '../logger.js';

import type { BotEvent } from '../types.js';

const event: BotEvent<Events.GuildCreate> = {
  name: Events.GuildCreate,

  execute: guild => {
    Log.info('The bot has joined the server:', chalk.white.bold(guild.name), 'with ID', chalk.white.bold(guild.id));
  },
};

export default event;
