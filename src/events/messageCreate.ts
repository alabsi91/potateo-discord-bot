import chalk from 'chalk';
import { Events, type Message } from 'discord.js';

import { getCommandPrefix, getCustomCommands } from '../firebase.js';
import { checkPermissions, sendTimedMessage } from '../helpers.js';
import { Log } from '../logger.js';
import { isTextChannel } from '../utils.js';

import type { BotEvent } from '../types.js';

async function executeCustomCommand(message: Message<boolean>) {
  if (!message.guild) return;

  if (!isTextChannel(message.channel)) return;

  const customCommands = await getCustomCommands(message.guild.id);
  if (!customCommands) {
    Log.error(
      'Failed to get welcome voice messages from database in the server',
      chalk.white.bold(message.guild.name),
      'with ID',
      chalk.white.bold(message.guild.id),
      '.',
    );
    return;
  }

  const command = customCommands.find(command => command.when === message.content.trim());
  if (!command) return; // no command found

  Log.info(
    'Custom command',
    chalk.white.bold(command.when),
    'executed by',
    chalk.white.bold(message.author.username),
    'with ID',
    chalk.white.bold(message.author.id),
    'in the channel',
    chalk.white.bold(message.channel.name),
    'of the server',
    chalk.white.bold(message.guild.name),
    'with ID',
    chalk.white.bold(message.guild.id),
    '.',
  );

  // execute command
  message.channel.send(command.say);
}

const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.member) return; // not a guild member
    if (message.member.user.bot) return; // message was sent by a bot
    if (!message.guild) return; // message was sent in DM
    if (!isTextChannel(message.channel)) return; // not a text channel

    // * custom commands
    executeCustomCommand(message);

    const prefix = await getCommandPrefix(message.guild.id);
    if (!prefix) {
      Log.error(
        'Failed to get command prefix from database in the server',
        chalk.white.bold(message.guild.name),
        'with ID',
        chalk.white.bold(message.guild.id),
        '.',
      );
      return;
    }

    if (!message.content.startsWith(prefix)) return; // command doesn't start with prefix

    const args = message.content.substring(prefix.length).split(' '); // parse command arguments
    let command = message.client.commands.get(args[0]); // get command

    // try to get command from alias
    if (!command) {
      const commandFromAlias = message.client.commands.find(command => command.aliases.includes(args[0]));
      if (!commandFromAlias) return;
      command = commandFromAlias;
    }

    // check permissions
    const neededPermissions = checkPermissions(message.member, command.permissions);
    if (neededPermissions !== null) {
      sendTimedMessage(
        `You don't have enough permissions to use this command.\nNeeded permissions: ${neededPermissions.join(', ')}`,
        message.channel,
        5000,
      );
      return;
    }

    // check cooldown
    const cooldown = message.client.cooldowns.get(`${command.name}-${message.member.user.username}`);
    if (command.cooldown) {
      // user has cooldown entry
      if (cooldown) {
        // check if cooldown timer is over
        if (Date.now() < cooldown) {
          sendTimedMessage(
            `You have to wait ${Math.floor(Math.abs(Date.now() - cooldown) / 1000)} second(s) to use this command again.`,
            message.channel,
            5000,
          );
          return;
        }

        // renew cooldown
        message.client.cooldowns.set(`${command.name}-${message.member.user.username}`, Date.now() + command.cooldown * 1000);

        // delete entry after cooldown is over
        setTimeout(() => {
          message.client.cooldowns.delete(`${command?.name}-${message.member?.user.username}`);
        }, command.cooldown * 1000);

        // set new cooldown entry
      } else {
        message.client.cooldowns.set(`${command.name}-${message.member.user.username}`, Date.now() + command.cooldown * 1000);
      }
    }

    Log.info(
      'Command',
      chalk.white.bold(command.name),
      'executed by',
      chalk.white.bold(message.author.username),
      'with ID',
      chalk.white.bold(message.author.id),
      'in the channel',
      chalk.white.bold(message.channel.name),
      'of the server',
      chalk.white.bold(message.guild.name),
      'with ID',
      chalk.white.bold(message.guildId),
      '.',
    );

    // execute command
    command.execute(message, args);
  },
};

export default event;
