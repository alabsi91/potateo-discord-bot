import { SlashCommandBuilder } from '@discordjs/builders';
import chalk from 'chalk';
import { ActivityType } from 'discord.js';

import { setBotActivity } from '../firebase.js';
import { Log } from '../logger.js';
import type { ActivityUnionType, SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('bot-activity')
    .setDescription('Change bot activity')
    .addStringOption(option => option.setName('status').setDescription('Write the status message').setRequired(true))
    .addStringOption(option =>
      option
        .setName('activity')
        .setDescription('Current activity')
        .setRequired(true)
        .addChoices({ name: 'playing', value: 'Playing' })
        .addChoices({ name: 'streaming', value: 'Streaming' })
        .addChoices({ name: 'listening', value: 'Listening' })
        .addChoices({ name: 'watching', value: 'Watching' })
        .addChoices({ name: 'Custom', value: 'Custom' })
        .addChoices({ name: 'Competing', value: 'Competing' }),
    ),

  async execute(interaction) {
    if (!interaction.guild) return; // not in a guild
    if (!interaction.guildId) return; // not in a guild

    const status = interaction.options.getString('status');
    const activity = interaction.options.getString('activity') as ActivityUnionType;

    if (!activity || !status) {
      await interaction.reply({ content: 'Please provide a type and a status message', ephemeral: true });
      return;
    }

    if (ActivityType[activity] === undefined) {
      await interaction.reply({ content: 'Please provide a valid activity type', ephemeral: true });
      return;
    }

    try {
      await setBotActivity({ type: activity, activity: status });
    } catch (error) {
      Log.error(
        'Failed to set bot activity in database for guild',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );
      await interaction.reply({ content: 'Failed to set bot activity in database. Please try again later.', ephemeral: true });
      return;
    }

    const client = interaction.client;

    client.user.setActivity(status, { type: ActivityType[activity] });

    await interaction.reply({ content: 'Activity has been set', ephemeral: true });
  },
};

export default command;
