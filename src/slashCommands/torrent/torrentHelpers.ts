import archiver from 'archiver';
import { createWriteStream, rmdirSync, statSync } from 'fs';
import path from 'path';

import config from '../../.config.json' with { type: 'json' };
import { formatUrlRoute, searchFiles, splitLongText } from '../../utils.js';

import type WebTorrent from 'webtorrent';

export function magnifyYtsLinks(link: string) {
  if (!link.startsWith('https://yts')) return link;

  const hashKey = link.replace(/.*download\//, '');

  return `magnet:?xt=urn:btih:${hashKey}
                &dn=${hashKey}
                &tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce
                &tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce
                &tr=http%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce
                &tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce`.replace(/\s/g, '');
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return '`' + parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + '` ' + sizes[i];
}

export function formateProgress(torrent: WebTorrent.Torrent) {
  const remainingTime = () => {
    const time = Math.floor(torrent.timeRemaining / 1000);
    const seconds = time % 60;
    const minutes = Math.floor(time / 60) % 60;
    const hours = Math.floor(time / 3600) % 24;
    const days = Math.floor(time / 86400);

    if (days > 0) return `\`${days}\`d \`${hours}\`h \`${minutes}\`m \`${seconds}\`s`;
    if (hours > 0) return `\`${hours}\`h \`${minutes}\`m \`${seconds}\`s`;
    if (minutes > 0) return `\`${minutes}\`m \`${seconds}\`s`;
    return `\`${seconds}\` second`;
  };

  return `
**Progress:** \`${~~(torrent.progress * 100)}%\`
**Download Speed**: ${formatBytes(torrent.downloadSpeed)} / second
**Upload Speed:** ${formatBytes(torrent.uploadSpeed)} / second
**Downloaded:** ${formatBytes(torrent.downloaded)} / ${formatBytes(torrent.length)}
**Remaining time:** ${remainingTime()}
**Peers:** \`${torrent.numPeers}\``;
}

export function zip(inputPath: string, outPath: string, level: number = 0) {
  level = Math.max(0, Math.min(9, level));

  const archive = archiver('zip', { zlib: { level } });
  const stream = createWriteStream(outPath);

  const isDirectory = statSync(inputPath).isDirectory();

  return new Promise((resolve, reject) => {
    if (isDirectory) {
      archive
        .directory(inputPath, false)
        .on('error', err => reject(err))
        .pipe(stream);
    } else {
      archive
        .file(inputPath, { name: path.basename(inputPath) })
        .on('error', err => reject(err))
        .pipe(stream);
    }

    stream.on('close', () => resolve(null));
    archive.finalize();
  });
}

export function videoLinks(): string[] {
  const downloadDir = path.prepare(config.torrent.downloadDir);
  const videoPaths = [];

  // get all video files
  for (let i = 0; i < config.torrent.videoExtensions.length; i++) {
    const ext = config.torrent.videoExtensions[i];
    const foundVideos = searchFiles(ext, downloadDir);
    videoPaths.push(...foundVideos);
  }

  const linkStream = formatUrlRoute(config.rest.streamLink);
  const linkBrowser = formatUrlRoute(config.rest.browserLink);
  const linkDownload = formatUrlRoute(config.rest.downloadLink);
  const domain = config.rest.domain.endsWith('/') ? config.rest.domain : config.rest.domain + '/';

  if (videoPaths.length === 0) return ['This torrent does not contain any video files.'];

  let formattedVideoLinks = '';

  for (let i = 0; i < videoPaths.length; i++) {
    const videoPath = videoPaths[i];
    const videoName = path.basename(videoPath);
    const videoEncodedURI = encodeURI(path.basename(videoPath));
    formattedVideoLinks += `**${videoName}**
          Browser: ${domain}${linkBrowser}${videoEncodedURI}
          Download: ${domain}${linkDownload}${videoEncodedURI}
          Stream: ${domain}${linkStream}${videoEncodedURI}\n\n`;
  }

  return splitLongText(formattedVideoLinks, { maxLength: 2000 });
}

export function cleanZipFolder() {
  const zipDir = path.prepare(config.torrent.zipDir);
  rmdirSync(zipDir, { recursive: true });
  path.prepare(config.torrent.zipDir); // recreate empty zip folder
}

export function cleanDownloadFolder() {
  const downloadDir = path.prepare(config.torrent.downloadDir);
  rmdirSync(downloadDir, { recursive: true });
  path.prepare(config.torrent.downloadDir); // recreate empty download folder
}

export function cleanFolders() {
  cleanDownloadFolder();
  cleanZipFolder();
}
