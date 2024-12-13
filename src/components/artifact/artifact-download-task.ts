import { createWriteStream } from 'fs';
import mkdirp from 'mkdirp';
import axios from 'axios';
import type { AxiosResponse } from 'axios/index';
import { join } from 'path';
import { IArtifact } from './artifact';
import { ArtifactTask } from './artifact-task';
import { exists } from '../util/util';

export const enum ArtifactDownloadTaskEvent {
  PROGRESS = 'progress',
  ERROR = 'error',
  FINISH = 'finish',
}

interface AxiosStream {
  on(e: 'data', listener: (data: Buffer) => void): this;
  pipe<T>(destination: T): T;
}

export interface IArtifactDownloadTaskProgress {
  recieved: number;
  total: number;
}

export class ArtifactDownloadTask extends ArtifactTask {
  constructor(artifact: Partial<IArtifact>, public readonly root: string) {
    super(artifact);
  }

  async start(): Promise<this> {
    const directory = join(this.root, this.artifact.directory);
    const directoryExist = await exists(directory);
    if (!directoryExist) await mkdirp.mkdirp(directory);

    const response = await axios<AxiosStream>({
      method: 'GET',
      url: this.artifact.url,
      responseType: 'stream',
    });

    const progress: IArtifactDownloadTaskProgress = {
      recieved: 0,
      total: parseInt(response.headers['content-length'], 10),
    };

    response.data.on('data', (chunk) => {
      progress.recieved += chunk.length;
      this.emit(ArtifactDownloadTaskEvent.PROGRESS, progress);
    });

    const writeStream = createWriteStream(join(this.root, this.artifact.path));

    const wait = new Promise<this>((resolve) => {
      writeStream
        .on(ArtifactDownloadTaskEvent.ERROR, (err) => {
          this.emit(ArtifactDownloadTaskEvent.ERROR, err);
        })
        .on(ArtifactDownloadTaskEvent.FINISH, () => {
          this.emit(ArtifactDownloadTaskEvent.FINISH);
          resolve(this);
        });
    });

    response.data.pipe(writeStream);

    return wait;
  }
}
