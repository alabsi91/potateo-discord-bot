import chalk from 'chalk';
import Fastify from 'fastify';
import { createReadStream, readFileSync, statSync } from 'fs';
import path from 'path';

import config from '../.config.json' with { type: 'json' };
import { Log } from '../logger.js';
import { getVideoFilePath, getZipFilePath, prepareHtml } from './restHelpers.js';

const fastify = Fastify({ logger: false });

// * serve zip files
fastify.get(config.rest.zip, (request, reply) => {
  const { fileName } = request.params as { fileName: string };

  const zipPath = getZipFilePath(fileName);

  if (!zipPath) {
    reply.code(404).send('File not found');
    return;
  }

  const stream = createReadStream(zipPath);

  reply.type('application/zip');

  reply.send(stream);
});

// * download video files
fastify.get(config.rest.downloadLink, (request, reply) => {
  const { fileName } = request.params as { fileName: string };

  const videoPath = getVideoFilePath(fileName);

  if (!videoPath) {
    reply.code(404);
    reply.send('File not found');
    return;
  }

  const stream = createReadStream(videoPath);

  reply
    .type('video/' + path.extname(videoPath).slice(1))
    .code(200)
    .send(stream);
});

// * serve html with video
fastify.get(config.rest.browserLink, (request, reply) => {
  const { fileName } = request.params as { fileName: string };

  const htmlString = prepareHtml(fileName);

  if (!htmlString) {
    reply.code(404);
    reply.send('File not found');
    return;
  }

  reply.type('text/html');
  reply.send(htmlString);
});

// * stream video
fastify.get(config.rest.streamLink, (req, reply) => {
  const { fileName } = req.params as { fileName: string };

  const videoPath = getVideoFilePath(fileName);

  if (!videoPath) {
    reply.status(404).send('No video file found.');
    return;
  }

  // Ensure there is a range given for the video
  const range = req.headers.range;

  const videoType = path.extname(videoPath).slice(1);
  const videoSize = statSync(videoPath).size;

  if (!range) {
    const head = {
      'Content-Length': videoSize,
      'Content-Type': 'video/' + videoType,
    };
    reply.raw.writeHead(200, head);
    createReadStream(videoPath).pipe(reply.raw);
    return;
  }

  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;

  // create video read stream for this particular chunk
  const videoStream = createReadStream(videoPath, { start, end });
  const chunksize = end - start + 1;

  // Create headers
  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'video/' + videoType,
  };

  // HTTP Status 206 for Partial Content
  reply.raw.writeHead(206, headers);

  // Stream the video chunk to the client
  videoStream.pipe(reply.raw);
});

fastify.get('/favicon.ico', (request, reply) => {
  const buffer = readFileSync(path.join(path.scriptPath, 'rest', 'public', 'favicon.ico'));
  reply.type('image/x-icon').code(200).send(buffer);
});

// Run the server!
export function startRestServer() {
  fastify.listen({ host: config.rest.host, port: config.rest.port }, err => {
    if (err) {
      Log.error('Failed to start Rest API Server!');
      console.error(err);
      return;
    }

    Log.success('Rest API Server listening on', chalk.white.bold(`http://${config.rest.host}:${config.rest.port}`));
  });
}
