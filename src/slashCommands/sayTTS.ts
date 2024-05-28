import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from '@discordjs/voice';
import chalk from 'chalk';
import { SlashCommandBuilder } from 'discord.js';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import config from '../.config.json' with { type: 'json' };
import { Log } from '../logger.js';
import * as discordTTS from '../tts/discord-tts.js';

import type { Collection, VoiceBasedChannel } from 'discord.js';
import type { Languages, SlashCommand } from '../types.js';

const ttsPath = path.isAbsolute(config.ttsTempFile)
  ? config.ttsTempFile
  : path.resolve(path.join(path.scriptPath, config.ttsTempFile));

// create tts save path
if (!existsSync(path.dirname(ttsPath))) {
  mkdirSync(path.dirname(ttsPath), { recursive: true });
}

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Play a TTS message in the current voice channel.')
    .addStringOption(option => option.setName('message').setDescription('The welcome message to set').setRequired(true))
    .addStringOption(option =>
      option
        .setName('language')
        .setDescription('Enter the language of the text.')
        .setRequired(false)
        .addChoices(
          { name: 'Afrikaans', value: 'af' },
          { name: 'Armenian', value: 'hy' },
          { name: 'Indonesian', value: 'id' },
          { name: 'German', value: 'de' },
          { name: 'English', value: 'en' },
          { name: 'Spanish', value: 'es' },
          { name: 'French', value: 'fr' },
          { name: 'Italian', value: 'it' },
          { name: 'Dutch', value: 'nl' },
          { name: 'Norwegian', value: 'nb' },
          { name: 'Polish', value: 'pl' },
          { name: 'Portuguese', value: 'pt' },
          { name: 'Romanian', value: 'ro' },
          { name: 'Finnish', value: 'fi' },
          { name: 'Swedish', value: 'sv' },
          { name: 'Turkish', value: 'tr' },
          { name: 'Greek', value: 'el' },
          { name: 'Russian', value: 'ru' },
          { name: 'Ukrainian', value: 'uk' },
          { name: 'Arabic', value: 'ar' },
          { name: 'Persian', value: 'fa' },
          { name: 'Hindi', value: 'hi' },
          { name: 'Korean', value: 'ko' },
          { name: 'Japanese', value: 'ja' },
          { name: 'Chinese', value: 'zh' },
        ),
    ),

  async execute(interaction) {
    if (!interaction.guild) return; // if the interaction is not in a guild

    const guildId = interaction.guildId;
    if (!guildId) {
      interaction.reply({ content: 'This command can only be used in a server', ephemeral: true });
      return;
    }

    // get voice channels in the guild
    type VoiceChannels = Collection<string, VoiceBasedChannel>;
    const voiceChannels = interaction.guild.channels.cache.filter(channel => channel.isVoiceBased()) as VoiceChannels;
    if (voiceChannels.size === 0) {
      await interaction.reply({ content: 'There are no voice channels in this server', ephemeral: true });
      return;
    }

    // get the channel that the user is in
    const userVoiceChannel = voiceChannels.find(channel => channel.members.has(interaction.user.id));
    if (!userVoiceChannel) {
      await interaction.reply({ content: 'You are not in a voice channel', ephemeral: true });
      return;
    }

    const message = interaction.options.getString('message');
    const lang = (interaction.options.getString('language') ?? 'en') as Languages;

    if (!message) {
      await interaction.reply({ content: 'You need to provide a message !!', ephemeral: true });
      return;
    }

    const channelId = userVoiceChannel.id;
    const adapterCreator = userVoiceChannel.guild.voiceAdapterCreator;

    try {
      await discordTTS.saveToFile(ttsPath, message, { lang, host: 'https://translate.google.com.br' });
    } catch (error) {
      Log.error(
        'Error saving TTS voice file in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(guildId),
        '.',
      );
      await interaction.reply({ content: 'An error occurred while generating the TTS voice', ephemeral: true });
      return;
    }

    const connection = joinVoiceChannel({ channelId, guildId, adapterCreator });

    try {
      connection.subscribe(player);
      player.play(createAudioResource(ttsPath));

      // leave voice channel and garbage collect sounds.
      player.once(AudioPlayerStatus.Idle, () => {
        player.stop();
        connection.destroy();
      });
    } catch (error) {
      Log.error(
        'Error playing TTS voice in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(guildId),
        '.',
      );
      player.stop();
      connection.destroy();
      await interaction.reply({ content: 'An error occurred while playing the TTS voice', ephemeral: true });
      return;
    }

    await interaction.reply({ content: 'TTS voice message sent', ephemeral: true });

    Log.info(
      'Slash command "say-tts" executed by the user',
      chalk.white.bold(interaction.user.username),
      'with ID',
      chalk.white.bold(interaction.user.id),
      'in the server',
      chalk.white.bold(interaction.guild.name),
      'with ID',
      chalk.white.bold(guildId),
      '.',
    );
  },

  cooldown: 10,
};

export default command;
