import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from '@discordjs/voice';
import chalk from 'chalk';
import { Events } from 'discord.js';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import config from '../.config.json' with { type: 'json' };
import { getVoiceWelcomeMessages } from '../firebase.js';
import { Log } from '../logger.js';
import * as discordTTS from '../tts/discord-tts.js';

import type { BotEvent } from '../types.js';

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

const event: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,

  execute: async (oldState, newState) => {
    const left = {
      is: newState.channelId === null,
      user: oldState.member?.user,
      channel: oldState.channel,
      guild: oldState.guild,
    };

    const joined = {
      is: oldState.channelId === null,
      user: newState.member?.user,
      channel: newState.channel,
      guild: newState.guild,
    };

    if (joined.is)
      Log.info(
        'Voice: The',
        joined.user?.bot ? 'Bot' : 'User',
        chalk.white.bold(joined.user?.tag ?? 'Unknown'),
        'with ID',
        chalk.white.bold(joined.user?.id ?? 'Unknown'),
        'joined',
        chalk.white.bold(joined.channel?.name ?? 'Unknown'),
        'channel of the server',
        chalk.white.bold(joined.guild.name),
        'with ID',
        chalk.white.bold(joined.guild.id),
        '.',
      );

    if (left.is)
      Log.info(
        'Voice: The',
        left.user?.bot ? 'Bot' : 'User',
        chalk.white.bold(left.user?.tag ?? 'Unknown'),
        'with ID',
        chalk.white.bold(left.user?.id ?? 'Unknown'),
        'left',
        chalk.white.bold(left.channel?.name ?? 'Unknown'),
        'channel of the server',
        chalk.white.bold(left.guild.name),
        'with ID',
        chalk.white.bold(left.guild.id),
        '.',
      );

    if (left.is || joined.user?.bot) return;

    const channelId = joined.channel?.id;
    const guildId = joined.guild.id;
    const adapterCreator = newState.guild.voiceAdapterCreator;

    if (!channelId) {
      Log.warn(
        'Voice: No channel ID found in the guild',
        chalk.white.bold(joined.guild.name),
        'with ID',
        chalk.white.bold(joined.guild.id),
        '.',
      );
      return;
    }

    const welcomeMessages = await getVoiceWelcomeMessages(guildId);
    if (!welcomeMessages) {
      Log.error(
        'Failed to get welcome voice messages from database in the server',
        chalk.white.bold(joined.guild.name),
        'with ID',
        chalk.white.bold(guildId),
        '.',
      );
      return;
    }

    const getUser = welcomeMessages.filter(user => user.id === newState.member?.id)[0];
    if (!getUser) return;

    const { message, lang } = getUser;

    try {
      await discordTTS.saveToFile(ttsPath, message, { lang, host: 'https://translate.google.com.br' });
    } catch (error) {
      Log.error('Voice: TTS error!');
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
      player.stop();
      connection.destroy();
      Log.error('Voice: Failed to play TTS audio!');
    }
  },
};

export default event;
