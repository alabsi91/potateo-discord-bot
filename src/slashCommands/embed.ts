import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { isTextChannel } from '../utils.js';

import type { ColorResolvable } from 'discord.js';
import type { SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('embed')
    .addStringOption(option => option.setName('title').setDescription('Title of the embed message').setRequired(true))
    .addStringOption(option =>
      option.setName('description').setDescription('Description of the embed message.').setRequired(true),
    )
    .addChannelOption(option =>
      option.setName('channel').setDescription('Text channel where the embed message will be sent.').setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('Select an option or type an hex color, for example: #000000')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .setDescription('Create a new embed message.'),

  autocomplete: async interaction => {
    try {
      const focusedValue = interaction.options.getFocused();
      const choices = [
        { name: 'White', value: 'White' },
        { name: 'Aqua', value: 'Aqua' },
        { name: 'Green', value: 'Green' },
        { name: 'Blue', value: 'Blue' },
        { name: 'Yellow', value: 'Yellow' },
        { name: 'Purple', value: 'Purple' },
        { name: 'LuminousVividPink', value: 'LuminousVividPink' },
        { name: 'Fuchsia', value: 'Fuchsia' },
        { name: 'Gold', value: 'Gold' },
        { name: 'Orange', value: 'Orange' },
        { name: 'Red', value: 'Red' },
        { name: 'Grey', value: 'Grey' },
        { name: 'Navy', value: 'Navy' },
        { name: 'DarkAqua', value: 'DarkAqua' },
        { name: 'DarkGreen', value: 'DarkGreen' },
        { name: 'DarkBlue', value: 'DarkBlue' },
        { name: 'DarkPurple', value: 'DarkPurple' },
        { name: 'DarkVividPink', value: 'DarkVividPink' },
        { name: 'DarkGold', value: 'DarkGold' },
        { name: 'DarkOrange', value: 'DarkOrange' },
        { name: 'DarkRed', value: 'DarkRed' },
        { name: 'DarkGrey', value: 'DarkGrey' },
        { name: 'DarkerGrey', value: 'DarkerGrey' },
        { name: 'LightGrey', value: 'LightGrey' },
        { name: 'DarkNavy', value: 'DarkNavy' },
      ];
      const filtered: { name: string; value: string }[] = [];
      for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        if (choice.name.includes(focusedValue)) filtered.push(choice);
      }
      await interaction.respond(filtered);
    } catch (error: unknown) {
      if (error instanceof Error) console.log(`Error: ${error.message}`);
    }
  },

  execute: async interaction => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const options = {
        title: interaction.options.getString('title') ?? '',
        description: interaction.options.getString('description') ?? '',
        color: (interaction.options.getString('color') as ColorResolvable) ?? 'White',
        channel: interaction.options.getChannel('channel'),
      };

      const embed = new EmbedBuilder()
        .setColor(options.color.toString() as ColorResolvable)
        .setTitle(options.title.toString())
        .setDescription(options.description.toString())
        .setAuthor({
          name: interaction.client.user?.username || 'Default Name',
          iconURL: interaction.client.user?.avatarURL() || undefined,
        })
        .setThumbnail(interaction.client.user?.avatarURL() || null)
        .setTimestamp()
        .setFooter({ text: 'Test embed message', iconURL: interaction.client.user?.avatarURL() || undefined });

      const selectedTextChannel = options.channel;

      const isATextChannel = isTextChannel(selectedTextChannel);

      if (!isATextChannel) {
        interaction.editReply({ content: 'Invalid channel type...' });
        return;
      }

      selectedTextChannel.send({ embeds: [embed] });

      return interaction.editReply({ content: 'Embed message successfully sent.' });
    } catch (error) {
      interaction.editReply({ content: 'Something went wrong...' });
      console.log(error);
    }
  },

  cooldown: 10,
};

export default command;
