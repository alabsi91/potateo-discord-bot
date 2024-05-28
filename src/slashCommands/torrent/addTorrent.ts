import path from 'path';

import config from '../../.config.json' with { type: 'json' };
import { sleep } from '../../utils.js';
import { formateProgress, magnifyYtsLinks } from './torrentHelpers.js';

import type WebTorrent from 'webtorrent';

type addTorrentParams = {
  client: WebTorrent.Instance;
  torrentLink: string;
  onError: (error: string) => void;
  onComplete: () => void;
  onUpdate: (progress: string) => Promise<unknown>;
  onReady: (torrent: WebTorrent.Torrent) => void;
};

export default function addTorrent(params: addTorrentParams) {
  let isDestroyed = false;
  let isDone = false;
  let currentTorrent: WebTorrent.Torrent | null = null;

  const destroy = () => {
    isDestroyed = true;
    if (!currentTorrent) return;
    currentTorrent.pause();
    currentTorrent.destroy();
  };

  const downloadDir = path.prepare(config.torrent.downloadDir);

  // try to magnify yts links
  params.torrentLink = params.torrentLink.startsWith('https://yts') ? magnifyYtsLinks(params.torrentLink) : params.torrentLink;

  const onTorrentAdded = async (torrent: WebTorrent.Torrent) => {
    currentTorrent = torrent;

    params.onReady(torrent);

    const onDownload = async () => {
      if (!torrent || isDestroyed || isDone) {
        clean();
        if (!isDone) params.onError('Failed to download torrent.');
        return;
      }

      const progress = formateProgress(torrent);
      await params.onUpdate(progress);
      await sleep(1000);
      onDownload();
    };

    onDownload();

    const clean = () => {
      isDestroyed = true;

      // remove listeners.
      torrent.removeListener('error', onError);
      torrent.removeListener('done', onComplete);

      // remove torrent.
      torrent.pause();
      torrent.destroy();
    };

    const onComplete = async () => {
      isDone = true;
      clean();
      params.onComplete();
    };

    const onError = async (error: unknown) => {
      clean();

      // fire passed error event
      const errorMessage = typeof error === 'string' && error ? error : 'Failed to download torrent.';
      params.onError(errorMessage);
    };

    torrent.once('error', onError);
    torrent.once('done', onComplete);
  };

  params.client.add(params.torrentLink, { path: downloadDir }, onTorrentAdded);

  return destroy;
}
