import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder().setName('ping').setDescription("Shows the bot's ping"),

  execute: interaction => {
    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({ name: 'MRC License' })
          .setDescription(`🏓 Pong! \n 📡 Ping: ${interaction.client.ws.ping}`)
          .setColor('Random'),
      ],
    });
  },

  cooldown: 10,
};

export default command;
