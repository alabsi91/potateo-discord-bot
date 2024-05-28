import { SlashCommandBuilder } from '@discordjs/builders';
import Canvas from 'canvas';
import chalk from 'chalk';
import { AttachmentBuilder } from 'discord.js';

import { Log } from '../logger.js';
import { isTextChannel, randomNum } from '../utils.js';

import type { Meme, MemeResponse, SlashCommand } from '../types.js';

const applyText = (canvas: Canvas.Canvas, text: string) => {
  const ctx = canvas.getContext('2d');
  let fontSize = 70;
  do {
    ctx.font = `${(fontSize -= 2)}px sans-serif`;
  } while (ctx.measureText(text).width > canvas.width - 20);

  return ctx.font;
};

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('mememe')
    .setDescription('Get random meme image with a text on it.')
    .addStringOption(option => option.setName('first-line').setDescription('Write on image').setRequired(false))
    .addStringOption(option => option.setName('second-line').setDescription('Write on image').setRequired(false)),

  async execute(interaction) {
    if (!interaction.guild) return; // not in a guild
    if (!isTextChannel(interaction.channel)) return; // not a text channel

    const firstLine = interaction.options.getString('first-line') || ' ';
    const secondLine = interaction.options.getString('second-line') || ' ';

    await interaction.deferReply();

    let meme: Meme | null = null;
    try {
      const response = await fetch('https://api.imgflip.com/get_memes');
      const body = await response.text();
      const { data } = JSON.parse(body) as MemeResponse;
      const filteredData = data.memes.filter(e => e.box_count === 2);
      meme = filteredData[randomNum(0, data.memes.length)];
    } catch (error) {
      Log.error(
        'Error: Failed to get meme from Imgflip in the server',
        chalk.white.bold(interaction.guild.name),
        'with ID',
        chalk.white.bold(interaction.guild.id),
        '.',
      );
      await interaction.editReply({ content: 'Failed to get a meme from Imgflip!' });
      return;
    }

    if (!meme) return;

    const canvas = Canvas.createCanvas(meme.width, meme.height);
    const ctx = canvas.getContext('2d');
    const bg = await Canvas.loadImage(meme.url);

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    ctx.font = `${meme.width * 0.075}px sans-serif`;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = applyText(canvas, firstLine);

    const getTextHeight = ctx.measureText(firstLine).actualBoundingBoxAscent + 10;

    ctx.strokeText(firstLine, meme.width / 2, getTextHeight);
    ctx.fillText(firstLine, meme.width / 2, getTextHeight);
    ctx.font = applyText(canvas, secondLine);
    ctx.strokeText(secondLine, meme.width / 2, meme.height - 10);
    ctx.fillText(secondLine, meme.width / 2, meme.height - 10);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });

    Log.info(
      'MemeMe command executed by',
      chalk.white.bold(interaction.user.username),
      'with ID',
      chalk.white.bold(interaction.user.id),
      'in the channel',
      chalk.white.bold(interaction.channel.name),
      'of the server',
      chalk.white.bold(interaction.guild.name),
      'with ID',
      chalk.white.bold(interaction.guild.id),
      '.',
    );

    await interaction.editReply({ content: meme.name, files: [attachment] });
  },
};

export default command;
