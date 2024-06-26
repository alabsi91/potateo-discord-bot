import { PermissionFlagsBits } from 'discord.js';

import type { GuildMember, PermissionResolvable, TextChannel } from 'discord.js';

export function checkPermissions(member: GuildMember, permissions: Array<PermissionResolvable>) {
  const neededPermissions: PermissionResolvable[] = [];

  permissions.forEach(permission => {
    if (!member.permissions.has(permission)) neededPermissions.push(permission);
  });

  if (neededPermissions.length === 0) return null;

  return neededPermissions.map(p => {
    if (typeof p === 'string') return p.split(/(?=[A-Z])/).join(' ');

    return Object.keys(PermissionFlagsBits)
      .find(k => Object(PermissionFlagsBits)[k] === p)
      ?.split(/(?=[A-Z])/)
      .join(' ');
  });
}

export function sendTimedMessage(message: string, channel: TextChannel, duration: number) {
  channel.send(message).then(m => setTimeout(async () => (await channel.messages.fetch(m)).delete(), duration));
}
