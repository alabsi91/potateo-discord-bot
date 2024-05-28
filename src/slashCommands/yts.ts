import { SlashCommandBuilder } from '@discordjs/builders';
import chalk from 'chalk';
import { ChannelType, type APIEmbed } from 'discord.js';

import { Log } from '../logger.js';
import { isTextChannel } from '../utils.js';

import type { Movie, SlashCommand, YtsResponse } from '../types.js';

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('yts')
    .setDescription('Search for a movie on yts database')
    .addStringOption(option =>
      option.setName('movie-name').setDescription('Enter the movie name to search for').setRequired(true),
    ),

  async execute(interaction) {
    if (!interaction.guild) return;
    if (!isTextChannel(interaction.channel)) return;

    const movieName = interaction.options.getString('movie-name');
    if (!movieName) {
      await interaction.reply({ content: 'Enter a movie name.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const ytsResponse = await fetchYtsMovies(movieName);
    if (!ytsResponse) {
      await interaction.editReply({ content: 'No movies found.' });
      return;
    }

    const movies = ytsResponse.data?.movies;
    if (!movies || movies.length === 0) {
      await interaction.editReply({ content: 'No movies found.' });
      return;
    }

    // send movie embed for results with one movie
    if (movies.length === 1) {
      const embed = createMovieEmbed(movies[0]);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    let moviesList = formatMovieList(ytsResponse);
    if (moviesList.length > 2000) moviesList = moviesList.substring(0, 2000); // 2000 character limit

    // send movies list
    await interaction.editReply({ content: moviesList });

    // wait for user input
    await interaction.fetchReply();

    const answerCollection = await interaction.channel.awaitMessages({
      filter: response => typeof +response.content === 'number', // make sure it's a number
      max: 1,
      time: 10000,
    });

    const answer = answerCollection.first();
    if (!answer) return;

    const selectedCommand = +answer.content;

    // check if command index is valid
    if (isNaN(selectedCommand) || selectedCommand > movies.length || selectedCommand <= 0) {
      await interaction.followUp({ content: 'Invalid command index number.' });
      return;
    }

    Log.info(
      'Slash command "yts" executed by the user',
      chalk.white.bold(interaction.user.username),
      'with ID',
      chalk.white.bold(interaction.user.id),
      'in the server',
      chalk.white.bold(interaction.guild.name),
      'with ID',
      chalk.white.bold(interaction.guildId),
      '.',
    );

    // remove user message
    if (answer.channel.type !== ChannelType.DM) await answer.delete();

    // remove yts list.
    await interaction.deleteReply();

    // send the movie details.
    await interaction.followUp({ embeds: [createMovieEmbed(movies[selectedCommand - 1])] });
  },
};

export default command;

async function fetchYtsMovies(movieName: string): Promise<YtsResponse | null> {
  movieName = movieName.replace(/\s/g, '+');

  try {
    const response = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${movieName}`);
    const body = await response.text();
    return JSON.parse(body) as YtsResponse;
  } catch (error) {
    return null;
  }
}

function formatMovieList(ytsData: YtsResponse): string {
  const movies = ytsData.data.movies;

  let movieList = '';

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    movieList += `\`${i + 1}.\` ${movie.title_long} - ${movie.year} .\n`;
  }

  movieList += '\n- Enter a number from the list to show the movie details.';

  return movieList;
}

function createMovieEmbed(movie: Movie): APIEmbed {
  const links = movie.torrents.map(e => {
    return {
      name: 'Torrent link:',
      value: `:link:   [${e.quality}.${e.type}](${e.url})`,
      inline: true,
    };
  });

  return {
    color: 0x0099ff,
    title: `${movie.title} (${movie.year})`,
    url: movie.url,
    description: movie.summary.substring(0, 1000),
    thumbnail: {
      url: movie.small_cover_image,
    },
    fields: [
      {
        name: '\u200b',
        value: '\u200b',
        inline: false,
      },

      {
        name: 'Rating:',
        value: ':star:   ' + movie.rating,
        inline: true,
      },
      {
        name: 'Genres:',
        value: ':movie_camera:  ' + movie.genres.join(', '),
        inline: true,
      },
      {
        name: 'Runtime:',
        value: ':clock1: ' + movie.runtime + ' minutes',
        inline: true,
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: false,
      },
      {
        name: 'Trailer:',
        value: `:link:   [Youtube](https://www.youtube.com/watch?v=${movie.yt_trailer_code})`,
        inline: true,
      },
      {
        name: 'IMDb:',
        value: `:link:   [IMDb](https://www.imdb.com/title/${movie.imdb_code})`,
        inline: true,
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: false,
      },
      ...links,
    ],
    image: {
      url: movie.large_cover_image,
    },
    timestamp: new Date().toISOString(),
    footer: {
      text: 'https://yts.mx',
    },
  };
}
