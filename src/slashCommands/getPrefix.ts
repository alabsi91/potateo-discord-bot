import chalk from 'chalk';
import { SlashCommandBuilder } from 'discord.js';

import { getCommandPrefix } from '../firebase.js';
import { Log } from '../logger.js';

import type { SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder().setName('get-prefix').setDescription('Get the current command prefix'),

  async execute(interaction) {
    if (!interaction.guild) return; // not in a guild

    if (!interaction.guildId) return; // not in a guild

    const prefix = await getCommandPrefix(interaction.guildId);
    if (!prefix) {
      Log.error(
        'Failed to get current prefix from database for the guild',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );
      await interaction.reply({
        content: 'Failed to get current prefix from database. Please try again later.',
        ephemeral: true,
      });
    }

    Log.info(
      'Slash command "get-prefix" executed by the user',
      chalk.white.bold(interaction.user.username),
      'with ID',
      chalk.white.bold(interaction.user.id),
      'in the server',
      chalk.white.bold(interaction.guild.name),
      'with ID',
      chalk.white.bold(interaction.guildId),
      '.',
    );

    await interaction.reply({ content: `The current prefix is: \`${prefix}\`` });
  },

  cooldown: 10,
};

export default command;
