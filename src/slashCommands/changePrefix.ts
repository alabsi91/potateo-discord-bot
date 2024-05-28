import chalk from 'chalk';
import { SlashCommandBuilder } from 'discord.js';

import { getCommandPrefix, setCommandPrefixMessages } from '../firebase.js';
import { Log } from '../logger.js';

import type { SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('change-prefix')
    .setDescription('Change command prefix')
    .addStringOption(option => option.setName('prefix').setDescription('Enter the new prefix').setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild) return; // not in a guild

    const newPrefix = interaction.options.getString('prefix');
    if (!newPrefix) {
      await interaction.reply({ content: 'Please enter a new prefix', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a server', ephemeral: true });
      return;
    }

    // try to get guild the current prefix to force a cache update
    try {
      await getCommandPrefix(guildId);
    } catch (error) {
      Log.error(
        'Failed to get current prefix from database for guild',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(guildId),
        '.',
      );
      await interaction.reply({
        content: 'An error occurred while getting the current prefix from the database',
        ephemeral: true,
      });
      return;
    }

    try {
      await setCommandPrefixMessages(guildId, newPrefix);
    } catch (error) {
      Log.error(
        'Failed to upload new prefix to database for guild',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(guildId),
        '.',
      );
      await interaction.reply({ content: 'An error occurred while uploading the new prefix to the database', ephemeral: true });
      return;
    }

    Log.info(
      'Slash command "change-prefix" executed with new the value "' + chalk.white.bold(newPrefix) + '"',
      'by the user',
      chalk.white.bold(interaction.user.tag),
      'with ID',
      chalk.white.bold(interaction.user.id),
      'for guild',
      chalk.white.bold(interaction.guild.name),
      'with ID',
      chalk.white.bold(guildId),
      '.',
    );
    await interaction.reply({ content: `Command prefix changed to \`${newPrefix}\``, ephemeral: true });
  },
};

export default command;
