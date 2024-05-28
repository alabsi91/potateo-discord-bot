import { SlashCommandBuilder } from '@discordjs/builders';
import chalk from 'chalk';

import { getVoiceWelcomeMessages, setVoiceWelcomeMessages } from '../firebase.js';
import { Log } from '../logger.js';

import type { Languages, SlashCommand } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('welcome-voice-message')
    .setDescription('Set a welcome TTS message every time someone joins the voice channel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set/update a welcome TTS message')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to set the welcome message for').setRequired(true),
        )
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
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a welcome message')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to remove the welcome message for').setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guild) return; // if the interaction is not in a guild

    const guildId = interaction.guildId;
    if (!guildId) {
      interaction.reply({ content: 'This command can only be used in a server', ephemeral: true });
      return;
    }

    const user = interaction.options.getUser('user');

    if (!user) {
      interaction.reply({ content: 'You need to provide a user !!', ephemeral: true });
      return;
    }

    if (user.bot) {
      interaction.reply({ content: "You can't set a welcome message for a bot !!", ephemeral: true });
      return;
    }

    const isSetCommand = interaction.options.getSubcommand() === 'set';
    const isRemoveCommand = interaction.options.getSubcommand() === 'remove';

    // * Set/Update user's welcome voice message
    if (isSetCommand) {
      const message = interaction.options.getString('message');
      const lang = (interaction.options.getString('language') ?? 'en') as Languages;

      if (!message) {
        await interaction.reply({ content: 'You need to provide a message !!', ephemeral: true });
        return;
      }

      const welcomeMessages = await getVoiceWelcomeMessages(guildId);
      if (!welcomeMessages) {
        Log.error(
          'Failed to get welcome voice messages from database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        return;
      }

      const getUser = welcomeMessages.filter(u => u.id === user.id)[0];

      // update
      if (getUser) {
        getUser.message = message;
        getUser.lang = lang;
        // set
      } else {
        welcomeMessages.push({ id: user.id, message, lang });
      }

      try {
        await setVoiceWelcomeMessages(guildId, welcomeMessages);
      } catch (error) {
        Log.error(
          'Failed to upload welcome voice messages to database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        await interaction.reply({ content: 'Failed to upload welcome voice messages to firebase', ephemeral: true });
        return;
      }

      await interaction.reply({ content: `${user.username} will be greeted with: "${message}".` });

      Log.info(
        'Slash command "welcome-voice-message-set" executed to',
        getUser ? 'update the' : 'set a new',
        'welcome voice message for the user',
        chalk.white.bold(user.username),
        'with ID',
        chalk.white.bold(user.id),
        'by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guild.id),
      );

      return;
    }

    // * Remove user's welcome voice message
    if (isRemoveCommand) {
      const welcomeMessages = await getVoiceWelcomeMessages(guildId);
      if (!welcomeMessages) {
        Log.error(
          'Failed to get welcome voice messages from database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        return;
      }

      const getUser = welcomeMessages.filter(u => u.id === user.id)[0];

      if (getUser) {
        welcomeMessages.splice(welcomeMessages.indexOf(getUser), 1);
      } else {
        interaction.reply({ content: `${user.username} doesn't have a welcome message !!`, ephemeral: true });
        return;
      }

      try {
        await setVoiceWelcomeMessages(guildId, welcomeMessages);
      } catch (error) {
        Log.error(
          'Failed to upload welcome voice messages to database in the server',
          chalk.white.bold(interaction.guild.name),
          'with ID',
          chalk.white.bold(guildId),
          '.',
        );
        await interaction.reply({ content: 'Failed to upload welcome voice messages to firebase', ephemeral: true });
        return;
      }

      await interaction.reply({ content: `${user.username}'s welcome message has been removed.` });

      Log.info(
        'Slash command "welcome-voice-message-remove" executed to remove the welcome voice message for the user',
        chalk.white.bold(user.username),
        'with ID',
        chalk.white.bold(user.id),
        'by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guild.id),
      );
    }
  },
};

export default command;
