import chalk from 'chalk';
import { MessageType, PermissionFlagsBits } from 'discord.js';

import { getCommandPrefix, getSavedList, setSavedList } from '../firebase.js';
import { Log } from '../logger.js';

import type { Command } from '../types.js';

const SUB_COMMANDS = {
  SAVE: 'save',
  GET: 'get',
  REMOVE: 'remove',
};

const command: Command = {
  name: 'list',

  async execute(message, args) {
    if (!message.guild) return;
    if (!message.guildId) return;

    const subCommand = args[1];

    if (subCommand !== SUB_COMMANDS.SAVE && subCommand !== SUB_COMMANDS.GET && subCommand !== SUB_COMMANDS.REMOVE) {
      message.reply({ content: 'invalid subcommand, use "get", "save" or "remove"' });
      return;
    }

    const savedList = await getSavedList(message.guildId);
    if (!savedList) {
      Log.error(
        'Failed to get saved list from database for the guild',
        chalk.white.bold(message.guild.name),
        'with ID',
        chalk.white.bold(message.guildId),
      );
      message.reply({ content: 'Failed to get saved list from database' });
      return;
    }

    // Add new item to the list
    if (subCommand === SUB_COMMANDS.SAVE) {
      if (message.type !== MessageType.Reply) {
        message.reply({ content: 'Please reference a message to save by replying to it.' });
        return;
      }

      const reply = await message.fetchReference();
      savedList.push(reply.content);

      try {
        await setSavedList(message.guildId, savedList);
      } catch (error) {
        Log.error(
          'Failed to upload saved list to database for the guild',
          chalk.white.bold(message.guild.name),
          'with ID',
          chalk.white.bold(message.guildId),
          '.',
        );
        message.reply({ content: 'Failed to upload saved list to database' });
        return;
      }

      const prefix = (await getCommandPrefix(message.guildId)) ?? '!'; // ignore error for this one
      message.reply({ content: `saved successfully, use \`${prefix}list get\` to show all saved messages` });

      return;
    }

    // Get saved list
    if (subCommand === SUB_COMMANDS.GET) {
      if (savedList.length === 0) {
        message.reply({ content: 'no saved messages' });
        return;
      }

      const savedMessages = savedList.map((saved, index) => `\`${index + 1}.\` [ ${saved} ]`);

      message.reply({ content: 'Saved Messages:\n' + '-------\n' + savedMessages.join('\n-------\n') + '\n-------' });

      return;
    }

    // Remove item from the list
    if (subCommand === SUB_COMMANDS.REMOVE) {
      if (savedList.length === 0) {
        message.reply({ content: 'no saved messages' });
        return;
      }

      const index = +args[2];

      if (isNaN(index) || index > savedList.length || index < 1) {
        message.reply({
          content: 'Invalid index, enter a number between `1` and `' + savedList.length + '` after the remove command',
        });
        return;
      }

      // Remove item from the list
      savedList.splice(index - 1, 1);

      try {
        await setSavedList(message.guildId, savedList);
      } catch (error) {
        Log.error(
          'Failed to upload saved list to database for the guild',
          chalk.white.bold(message.guild.name),
          'with ID',
          chalk.white.bold(message.guildId),
          '.',
        );
        message.reply({ content: 'Failed to upload saved list to database' });
        return;
      }

      message.reply({ content: 'The item at index `' + index + '` has been removed from the list' });

      return;
    }
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.SendMessages],
};

export default command;
