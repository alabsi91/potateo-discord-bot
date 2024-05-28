import { PermissionFlagsBits } from 'discord.js';

import type { Command } from '../types.js';

const command: Command = {
  name: 'greet',
  execute: message => {
    const toGreet = message.mentions.members?.first();
    message.channel.send(`Hello there ${toGreet ? toGreet.user.username : message.member?.user.username}!`);
  },
  cooldown: 10,
  aliases: ['sayhello'],
  permissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuildExpressions], // to test
};

export default command;
