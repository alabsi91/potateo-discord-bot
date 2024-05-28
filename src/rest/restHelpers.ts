import { existsSync, readFileSync } from 'fs';
import path from 'path';

import config from '../.config.json' with { type: 'json' };
import { formatUrlRoute, searchFiles } from '../utils.js';

export function getZipFilePath(zipFileName: string) {
  const zipDir = path.prepare(config.torrent.zipDir);
  const zipFullPath = path.join(zipDir, encodeURI(zipFileName));

  if (!existsSync(zipFullPath)) {
    return null;
  }

  return zipFullPath;
}

export function getVideoFilePath(encodedFileName: string): string | null {
  const decodedFileName = decodeURIComponent(encodedFileName);
  const videoExtension = path.extname(decodedFileName).slice(1);
  const downloadDir = path.prepare(config.torrent.downloadDir);

  // search recursively for the video file
  const foundVideos = searchFiles(videoExtension, downloadDir);

  const videoPath = foundVideos.filter(videoFullPath => path.basename(videoFullPath) === decodedFileName)[0];

  if (!videoPath) return null;

  return videoPath;
}

export function prepareHtml(videoName: string): string | null {
  const htmlFilePath = path.join(path.scriptPath, 'rest', 'public', 'index.html');

  const exists = getVideoFilePath(videoName);
  if (!exists) return null;

  const videoType = path.extname(videoName).slice(1);
  const videoPath = '/' + formatUrlRoute(config.rest.streamLink) + encodeURI(videoName);

  const html = readFileSync(htmlFilePath)
    .toString()
    .replace('$videoPath', videoPath)
    .replace('$title', videoName)
    .replace('$videoType', videoType);

  return html.toString();
}
