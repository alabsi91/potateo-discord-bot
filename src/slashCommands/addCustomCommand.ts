import { SlashCommandBuilder } from '@discordjs/builders';
import chalk from 'chalk';

import { getCustomCommands, setCustomCommands } from '../firebase.js';
import { Log } from '../logger.js';
import { isTextChannel } from '../utils.js';

import type { SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('custom-command')
    .setDescription('Add custom command')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new command')
        .addStringOption(option => option.setName('command').setDescription('Enter the command.').setRequired(true))
        .addStringOption(option =>
          option.setName('response').setDescription('Enter the response to the command.').setRequired(true),
        ),
    )
    .addSubcommand(subcommand => subcommand.setName('remove').setDescription('Remove a command'))
    .addSubcommand(subcommand => subcommand.setName('list').setDescription('Show all added commands.')),

  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return; // not in a guild

    if (!interaction.guild) return; // not in a guild

    if (!isTextChannel(interaction.channel)) return; // not in a text channel

    // Add new command
    if (interaction.options.getSubcommand() === 'add') {
      const command = interaction.options.getString('command');
      const response = interaction.options.getString('response');

      if (!command || !response) {
        await interaction.reply({ content: 'Please enter both command and response', ephemeral: true });
        return;
      }

      const customCommands = await getCustomCommands(guildId); // get from firebase
      if (!customCommands) {
        Log.error(
          'Failed to get custom commands from database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        await interaction.reply({ content: 'Failed to get custom commands from firebase!', ephemeral: true });
        return;
      }

      // check if command already exists
      const isCommandExist = customCommands.some(c => c.when.toLowerCase() === command.toLowerCase());
      if (isCommandExist) {
        await interaction.reply({ content: 'Command already exists', ephemeral: true });
        return;
      }

      // add new command
      customCommands.push({ when: command, say: response });

      // upload to firebase
      try {
        await setCustomCommands(guildId, customCommands);
      } catch (error) {
        Log.error(
          'Failed to upload custom commands to database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        await interaction.reply({ content: 'Failed to upload custom commands to firebase!', ephemeral: true });
        return;
      }

      // success
      await interaction.reply({ content: '**New command has been added**', ephemeral: true });
      Log.info(
        'Slash command "custom-command-add" executed with the value',
        chalk.white.bold(command),
        'by the user',
        chalk.white.bold(interaction.user.tag),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the channel',
        chalk.white.bold(interaction.channel.name),
        'of the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );
      return;
    }

    // Remove a command
    if (interaction.options.getSubcommand() === 'remove') {
      const customCommands = await getCustomCommands(guildId);
      if (!customCommands) {
        Log.error(
          'Failed to get custom commands from database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        await interaction.reply({ content: 'Failed to get custom commands from firebase!', ephemeral: true });
        return;
      }

      if (customCommands.length === 0) {
        await interaction.reply({ content: 'No commands added yet', ephemeral: true });
        return;
      }

      const listString =
        customCommands.map((c, i) => `\`${i + 1}.\` ${c.when}.`).join('\n') + '\n\n- Enter the command number to remove it.';

      // send the list and wait for the user's answer
      await interaction.reply({ content: listString, fetchReply: true });

      const answerCollection = await interaction.channel.awaitMessages({
        filter: response => typeof +response.content === 'number', // make sure it's a number
        max: 1,
        time: 10000,
      });

      const answer = answerCollection.first();
      if (!answer) return;

      const selectedCommand = +answer.content;

      // check if command index is valid
      if (isNaN(selectedCommand) || selectedCommand > customCommands.length || selectedCommand <= 0) {
        interaction.editReply({ content: 'Invalid command index number.' });
        return;
      }

      // remove the command from the array
      const removedCommand = customCommands.splice(selectedCommand - 1, 1); // -1 because array index starts from 0

      // upload to firebase
      try {
        await setCustomCommands(guildId, customCommands);
      } catch (error) {
        Log.error(
          'Failed to upload custom commands to database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        interaction.reply({ content: 'Failed to upload custom commands to firebase!', ephemeral: true });
        return;
      }

      // success
      await interaction.editReply({ content: ` **Command \`${removedCommand[0].when}\` has been removed**` });

      // delete user message.
      await answer.delete();

      Log.info(
        'Slash command "custom-command-remove" executed with the value',
        chalk.white.bold(removedCommand[0].when),
        'by the user',
        chalk.white.bold(interaction.user.tag),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the channel',
        chalk.white.bold(interaction.channel.name),
        'of the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );
    }

    // List all commands
    if (interaction.options.getSubcommand() === 'list') {
      const customCommands = await getCustomCommands(guildId);
      if (!customCommands) {
        Log.error(
          'Failed to get custom commands from database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        await interaction.reply({ content: 'Failed to get custom commands from firebase!', ephemeral: true });
        return;
      }

      if (customCommands.length === 0) {
        interaction.reply({ content: 'No commands added yet', ephemeral: true });
        return;
      }

      const listString = customCommands.map((c, i) => `\`${i + 1}.\` ${c.when}.`).join('\n');

      await interaction.reply({ content: listString, ephemeral: true });

      Log.info(
        'Slash command "custom-command-list" executed by the user',
        chalk.white.bold(interaction.user.tag),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the channel',
        chalk.white.bold(interaction.channel.name),
        'of the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );
    }
  },
};

export default command;
