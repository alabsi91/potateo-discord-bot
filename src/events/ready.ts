import chalk from 'chalk';
import { ActivityType, Events } from 'discord.js';

import { getBotActivity } from '../firebase.js';
import { Log } from '../logger.js';

import type { BotEvent } from '../types.js';

const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    if (!client.user) {
      Log.error('Failed to get bot user on startup.');
      return;
    }

    Log.success('Logged in as', chalk.white.bold(client.user.tag));

    const activity = await getBotActivity();
    if (!activity) {
      Log.error('Failed to get bot activity from database on startup.');
      return;
    }

    Log.info('Setting bot status to', chalk.white.bold(activity.activity), 'with activity type', chalk.white.bold(activity.type));

    client.user.setActivity(activity.activity, { state: activity.activity, type: ActivityType[activity.type] });
  },
};

export default event;
