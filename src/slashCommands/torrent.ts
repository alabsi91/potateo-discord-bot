import { SlashCommandBuilder } from '@discordjs/builders';
import chalk from 'chalk';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { readdir, rm } from 'fs/promises';
import path from 'path';
import WebTorrent from 'webtorrent';

import config from '../.config.json' with { type: 'json' };
import { Log } from '../logger.js';
import { formatUrlRoute, isTextChannel } from '../utils.js';
import addTorrent from './torrent/addTorrent.js';
import { cleanFolders, videoLinks, zip } from './torrent/torrentHelpers.js';

import type { SlashCommand } from '../types.js';

const client = new WebTorrent({ webSeeds: false });

let destroyCurrentTorrent: null | (() => void) = null;

const SUB_COMMANDS = {
  ADD: 'add',
  STOP: 'stop',
  CLEAN: 'clean',
  DELETE_TORRENT: 'delete-torrent',
  DELETE_ZIP: 'delete-zip-file',
  VIDEO_LINKS: 'video-links',
  ZIP: 'zip',
  LIST_DOWNLOADED: 'list-downloaded',
  LIST_ZIPS: 'list-zips',
};

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('torrent')
    .setDescription('Downloads torrent files')
    .addSubcommand(subcommand =>
      subcommand
        .setName(SUB_COMMANDS.ADD)
        .setDescription('Adds a torrent file to be downloaded')
        .addStringOption(option => option.setName('link').setDescription('Enter torrent link').setRequired(true)),
    )
    .addSubcommand(subcommand => subcommand.setName(SUB_COMMANDS.STOP).setDescription('Stop and remove current torrent'))
    .addSubcommand(subcommand =>
      subcommand.setName(SUB_COMMANDS.CLEAN).setDescription('Removes all torrents and zip files on the server'),
    )
    .addSubcommand(subcommand => subcommand.setName(SUB_COMMANDS.VIDEO_LINKS).setDescription('Get the links to the video files'))
    .addSubcommand(subcommand =>
      subcommand
        .setName(SUB_COMMANDS.ZIP)
        .setDescription('Create zip file from a downloaded torrent folder')
        .addIntegerOption(option =>
          option.setName('level').setDescription('Compression level').setMinValue(0).setMaxValue(9).setRequired(false),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand.setName(SUB_COMMANDS.LIST_DOWNLOADED).setDescription('List all downloaded torrent folders'),
    )
    .addSubcommand(subcommand => subcommand.setName(SUB_COMMANDS.LIST_ZIPS).setDescription('List all zip files'))
    .addSubcommand(subcommand =>
      subcommand.setName(SUB_COMMANDS.DELETE_TORRENT).setDescription('Removes a downloaded torrent folder'),
    )
    .addSubcommand(subcommand => subcommand.setName(SUB_COMMANDS.DELETE_ZIP).setDescription('Removes a zip file')),

  async execute(interaction) {
    if (!interaction.guild) return;
    if (!isTextChannel(interaction.channel)) return; // not a text channel

    const subcommand = interaction.options.getSubcommand();

    if (!subcommand) {
      await interaction.reply({ content: 'Please provide a subcommand.', ephemeral: true });
      return;
    }

    // * Stop any ongoing torrents
    if (subcommand === SUB_COMMANDS.STOP) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.STOP,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      if (!destroyCurrentTorrent) {
        await interaction.reply({ content: 'No torrents are currently running.', ephemeral: true });
        return;
      }

      destroyCurrentTorrent();

      await interaction.reply({ content: `Torrent has been stopped.`, ephemeral: true });

      return;
    }

    // * Add torrent
    if (subcommand === SUB_COMMANDS.ADD) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.ADD,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const torrentLink = interaction.options.getString('link');
      if (!torrentLink) {
        await interaction.reply({ content: 'Please provide a torrent link.', ephemeral: true });
        return;
      }

      const currentTorrents = client.torrents;
      if (currentTorrents.length > 0) {
        await interaction.reply({
          content: `Please stop currently downloading torrent before adding a new one.\nUse \`/torrent ${SUB_COMMANDS.STOP}\` to stop currently downloading torrent.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const onReady = async () => void (await interaction.editReply({ content: 'Downloading...' }));

      const onUpdate = async (progress: string) => await interaction.editReply({ content: progress });

      const onComplete = async () => {
        destroyCurrentTorrent = null;

        await interaction.editReply({
          content:
            'Download complete. ✅\nUse `/torrent ' +
            SUB_COMMANDS.VIDEO_LINKS +
            '` to get the links to the video files.\nUse `/torrent ' +
            SUB_COMMANDS.LIST_DOWNLOADED +
            '` to list all downloaded torrents.',
        });
      };

      const onError = async (error: string) => {
        destroyCurrentTorrent = null;
        Log.error('Error while downloading torrent', error);
        await interaction.editReply({ content: error });
      };

      destroyCurrentTorrent = addTorrent({ client, torrentLink, onReady, onUpdate, onComplete, onError });

      return;
    }

    // * Video links
    if (subcommand === SUB_COMMANDS.VIDEO_LINKS) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.VIDEO_LINKS,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const links = videoLinks();
      await interaction.reply({ content: links[0] });
      links.forEach(async (e, i) => {
        if (i > 0) await interaction.followUp({ content: e });
      });

      return;
    }

    // * Delete download and zip directories
    if (subcommand === SUB_COMMANDS.CLEAN) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.CLEAN,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const yesButton = new ButtonBuilder().setCustomId('clean-torrent-yes').setLabel('yes').setStyle(ButtonStyle.Danger);
      const noButton = new ButtonBuilder().setCustomId('clean-torrent-no').setLabel('no').setStyle(ButtonStyle.Primary);
      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

      await interaction.reply({
        content: 'Are you sure you want to delete all torrents and zip files ?',
        components: [buttonsRow],
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId === 'clean-torrent-yes' || i.customId === 'clean-torrent-no',
        time: 15000,
      });

      // on button click
      collector.once('collect', async buttonInteraction => {
        // yes
        if (buttonInteraction.customId === 'clean-torrent-yes') {
          // stop any ongoing torrents.
          if (destroyCurrentTorrent) destroyCurrentTorrent();

          // remove all torrents and zip files.
          cleanFolders();

          await buttonInteraction.update({ content: 'All torrents and zip files removed.', components: [] });
        }

        // no
        if (buttonInteraction.customId === 'clean-torrent-no')
          await buttonInteraction.update({ content: 'Ok, no problem.', components: [] });
      });

      // if user didn't answer in time.
      collector.once('end', async collected => {
        if (collected.size === 0) await interaction.editReply({ content: 'Never mind.', components: [] });
      });

      return;
    }

    // * Choose a downloaded torrent folder and zip it
    if (subcommand === SUB_COMMANDS.ZIP) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.ZIP,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const level = interaction.options.getInteger('level') ?? 0;
      const downloadDir = path.prepare(config.torrent.downloadDir);
      const zipDir = path.prepare(config.torrent.zipDir);

      const files = await readdir(downloadDir); // files and folders in download dir

      if (!files.length) {
        await interaction.reply({ content: 'Downloads folder is empty.', ephemeral: true });
        return;
      }

      const header = 'Downloaded torrents:\n\n';
      const filesList = files.map((file, i) => `\`${i + 1}. \` **${file}**`).join('\n');
      const instruction = '\n\nType the number of the torrent you want to zip.';

      await interaction.reply({ content: header + filesList + instruction, fetchReply: true });

      const answerCollection = await interaction.channel.awaitMessages({
        filter: response => typeof +response.content === 'number', // make sure it's a number
        max: 1,
        time: 10000,
      });

      const answer = answerCollection.first();
      if (!answer) return;

      const folderIndex = +answer.content;

      // check if command index is valid
      if (isNaN(folderIndex) || folderIndex > filesList.length || folderIndex <= 0) {
        await interaction.followUp({ content: 'Invalid command index number.' });
        return;
      }
      // remove user message
      if (answer.channel.type !== ChannelType.DM) await answer.delete();

      await interaction.editReply({ content: 'Creating zip...' });

      const fileName = files[folderIndex - 1];
      const filePath = path.join(downloadDir, fileName);
      const zipFileName = encodeURI(fileName + '.zip');
      const outZipPath = path.join(zipDir, zipFileName);

      await zip(filePath, outZipPath, level);

      const zipRoute = formatUrlRoute(config.rest.zip);
      const domain = config.rest.domain.endsWith('/') ? config.rest.domain : config.rest.domain + '/';
      const link = `${domain}${zipRoute}${zipFileName}`;

      await interaction.editReply({ content: `**Download Zip File**:\n${link}\n` });

      return;
    }

    // * List downloaded torrent folders
    if (subcommand === SUB_COMMANDS.LIST_DOWNLOADED) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.LIST_DOWNLOADED,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const downloadDir = path.prepare(config.torrent.downloadDir);
      const files = await readdir(downloadDir);

      if (!files.length) {
        await interaction.reply({ content: 'Downloads folder is empty.', ephemeral: true });
        return;
      }

      const header = 'Downloaded folders:\n\n';
      const filesList = files.map((file, i) => `\`${i + 1}. \` **${file}**`).join('\n');
      const instruction = `\n\nUse \`/torrent ${SUB_COMMANDS.DELETE_TORRENT}\` to delete a downloaded torrent.\nUse \`/torrent ${SUB_COMMANDS.ZIP}\` to create a zip file from a downloaded torrent.`;

      await interaction.reply({ content: header + filesList + instruction });

      return;
    }

    // * List zip files
    if (subcommand === SUB_COMMANDS.LIST_ZIPS) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.LIST_ZIPS,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const zipDir = path.prepare(config.torrent.zipDir);
      const files = await readdir(zipDir);

      if (!files.length) {
        await interaction.reply({ content: 'Zip folder is empty.', ephemeral: true });
        return;
      }

      const header = 'Zip files:\n\n';
      const filesList = files
        .map((file, i) => {
          const zipRoute = formatUrlRoute(config.rest.zip);
          const domain = config.rest.domain.endsWith('/') ? config.rest.domain : config.rest.domain + '/';
          const link = `${domain}${zipRoute}${encodeURI(file)}`;
          return `\`${i + 1}. \` **${link}**`;
        })
        .join('\n');
      const instruction = `\n\nYou can use the command \`/torrent ${SUB_COMMANDS.DELETE_ZIP}\` to delete a zip file.`;

      await interaction.reply({ content: header + filesList + instruction });

      return;
    }

    // * Remove a downloaded torrent folder
    if (subcommand === SUB_COMMANDS.DELETE_TORRENT) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.DELETE_TORRENT,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const downloadDir = path.prepare(config.torrent.downloadDir);
      const files = await readdir(downloadDir); // files and folders in download dir

      if (!files.length) {
        await interaction.reply({ content: 'Downloads folder is empty.', ephemeral: true });
        return;
      }

      const header = 'Downloaded torrents:\n\n';
      const foldersList = files.map((file, i) => `\`${i + 1}. \` **${file}**`).join('\n');
      const instruction = '\n\nType the number of the torrent you want to delete.';

      const reply = await interaction.reply({ content: header + foldersList + instruction, fetchReply: true });

      // wait for user to select a folder to be removed.
      const answerCollection = await interaction.channel.awaitMessages({
        filter: response => typeof +response.content === 'number', // make sure it's a number
        max: 1,
        time: 10000,
      });

      const answer = answerCollection.first();
      if (!answer) return;

      const folderIndex = +answer.content;

      // check if command index is valid
      if (isNaN(folderIndex) || folderIndex > foldersList.length || folderIndex <= 0) {
        await interaction.followUp({ content: 'Invalid command index number.' });
        return;
      }

      // remove user message
      if (answer.channel.type !== ChannelType.DM) await answer.delete();

      const fileName = files[folderIndex - 1];
      const filePath = path.join(downloadDir, fileName);

      // ask user for confirmation
      const yesButton = new ButtonBuilder().setCustomId('remove-torrent-yes').setLabel('yes').setStyle(ButtonStyle.Danger);
      const noButton = new ButtonBuilder().setCustomId('remove-torrent-no').setLabel('no').setStyle(ButtonStyle.Primary);
      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

      await reply.edit({
        content: `Are you sure you want to delete "**${fileName}**" ?`,
        components: [buttonsRow],
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId === 'remove-torrent-yes' || i.customId === 'remove-torrent-no',
        time: 15000,
      });

      // when the user press a button.
      collector.once('collect', async buttonInteraction => {
        // yes.
        if (buttonInteraction.customId === 'remove-torrent-yes') {
          await rm(filePath, { recursive: true });
          await buttonInteraction.update({ content: `"**${fileName}**" has been deleted.`, components: [] });
        }
        // No.
        if (buttonInteraction.customId === 'remove-torrent-no')
          await buttonInteraction.update({ content: 'Ok, no problem.', components: [] });
      });

      // if user didn't answer in time.
      collector.once('end', collected => {
        if (collected.size === 0) interaction.editReply({ content: 'Never mind.', components: [] });
      });
    }

    // * Remove a zip file
    if (subcommand === SUB_COMMANDS.DELETE_ZIP) {
      Log.info(
        'Slash command "torrent',
        SUB_COMMANDS.DELETE_ZIP,
        '" executed by the user',
        chalk.white.bold(interaction.user.username),
        'with ID',
        chalk.white.bold(interaction.user.id),
        'in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guildId),
        '.',
      );

      const zipDir = path.prepare(config.torrent.zipDir);
      const files = await readdir(zipDir);

      if (!files.length) {
        await interaction.reply({ content: 'No zip files found.', ephemeral: true });
        return;
      }

      const header = 'Zip files:\n\n';
      const filesList = files.map((file, i) => `\`${i + 1}. \` **${file}**`).join('\n');
      const instruction = '\n\nType the number of the file you want to delete.';

      const reply = await interaction.reply({ content: header + filesList + instruction, fetchReply: true });

      // wait for user to select a file to be removed.
      const answerCollection = await interaction.channel.awaitMessages({
        filter: response => typeof +response.content === 'number', // make sure it's a number
        max: 1,
        time: 10000,
      });

      const answer = answerCollection.first();
      if (!answer) return;

      const fileIndex = +answer.content;

      // check if command index is valid
      if (isNaN(fileIndex) || fileIndex > filesList.length || fileIndex <= 0) {
        await interaction.followUp({ content: 'Invalid command index number.' });
        return;
      }

      // remove user message
      if (answer.channel.type !== ChannelType.DM) await answer.delete();

      const fileName = files[fileIndex - 1];
      const filePath = path.join(zipDir, fileName);

      // ask user for confirmation
      const yesButton = new ButtonBuilder().setCustomId('remove-zip-yes').setLabel('yes').setStyle(ButtonStyle.Danger);
      const noButton = new ButtonBuilder().setCustomId('remove-zip-no').setLabel('no').setStyle(ButtonStyle.Primary);
      const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton);

      await reply.edit({
        content: `Are you sure you want to delete "**${fileName}**" ?`,
        components: [buttonsRow],
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId === 'remove-zip-yes' || i.customId === 'remove-zip-no',
        time: 15000,
      });

      // when the user press a button.
      collector.once('collect', async buttonInteraction => {
        // yes.
        if (buttonInteraction.customId === 'remove-zip-yes') {
          await rm(filePath, { recursive: true });
          await buttonInteraction.update({ content: `"**${fileName}**" has been deleted.`, components: [] });
        }
        // No.
        if (buttonInteraction.customId === 'remove-zip-no')
          await buttonInteraction.update({ content: 'Ok, no problem.', components: [] });
      });

      // if user didn't answer in time.
      collector.once('end', collected => {
        if (collected.size === 0) interaction.editReply({ content: 'Never mind.', components: [] });
      });
    }
  },
};

export default command;
