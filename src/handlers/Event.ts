import chalk from 'chalk';
import { readdir } from 'fs/promises';
import path from 'path';

import { Log } from '../logger.js';

import type { Client } from 'discord.js';
import type { BotEvent } from '../types.js';

export default async function (client: Client) {
  const eventsDir = 'events';

  const eventFiles = await readdir(path.join(path.scriptPath, eventsDir));

  for (const file of eventFiles) {
    if (!file.endsWith('.js')) continue;

    const event: BotEvent = (await import(`../${eventsDir}/${file}`)).default;

    event.once ? client.once(event.name, event.execute) : client.on(event.name, event.execute);

    Log.success(`Successfully loaded event ${chalk.white.bold(event.name)}`);
  }
}
