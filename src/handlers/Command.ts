import chalk from 'chalk';
import { REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import path from 'path';

import { Log } from '../logger.js';

import type { Client, SlashCommandBuilder } from 'discord.js';
import type { Command, SlashCommand } from '../types.js';

export default async function (client: Client) {
  const slashCommands: SlashCommandBuilder[] = [];
  const commands: Command[] = [];

  // Slash commands
  const slashCommandsDir = 'slashCommands';

  const slashCommandsFiles = await readdir(path.join(path.scriptPath, slashCommandsDir));
  for (const file of slashCommandsFiles) {
    if (!file.endsWith('.js')) continue;

    const command: SlashCommand = (await import(`../${slashCommandsDir}/${file}`)).default;
    slashCommands.push(command.command);

    client.slashCommands.set(command.command.name, command);
  }

  // commands
  const commandsDir = 'commands';

  const commandsFiles = await readdir(path.join(path.scriptPath, commandsDir));
  for (const file of commandsFiles) {
    if (!file.endsWith('.js')) continue;

    const command: Command = (await import(`../${commandsDir}/${file}`)).default;
    commands.push(command);

    client.commands.set(command.name, command);
  }

  // register slash commands
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: slashCommands.map(command => command.toJSON()),
  });

  Log.success('Successfully loaded', chalk.white.bold((data as unknown[]).length), 'slash command(s)');
  Log.success('Successfully loaded', chalk.white.bold(commands.length), 'command(s)');
}
