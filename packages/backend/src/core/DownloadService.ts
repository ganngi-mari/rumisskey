/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import * as stream from 'node:stream/promises';
import { Inject, Injectable } from '@nestjs/common';
import chalk from 'chalk';
import got, * as Got from 'got';
import dns from "dns";
import { parse } from 'content-disposition';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { createTemp } from '@/misc/create-temp.js';
import { StatusError } from '@/misc/status-error.js';
import { LoggerService } from '@/core/LoggerService.js';
import type Logger from '@/logger.js';

import { bindThis } from '@/decorators.js';

@Injectable()
export class DownloadService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('download');
	}

	@bindThis
	public async downloadUrl(url: string, path: string): Promise<{
		filename: string;
	}> {
		this.logger.info(`Downloading ${chalk.cyan(url)} to ${chalk.cyanBright(path)} ...`);

		const timeout = 30 * 1000;
		const operationTimeout = 60 * 1000;
		const maxSize = this.config.maxFileSize;

		/*
		//hostsを読むように変更
		const HostsFile = fs.readFileSync("/etc/hosts", "utf-8");
		for (let I = 0; I < HostsFile.split("\n").length; I++) {
			const Line = HostsFile.split("\n")[I];
			if (!Line.startsWith("#")) {
				const Match = Line.match(/(.*)\s+(.*)/);
				if (Match != null && Match[1] != null && Match[2] != null) {
					if (url.includes(Match[2])) {
						this.logger.info(`${Match[2]}を${Match[1]}に置換したぜ！`);
						url = url.replaceAll(Match[2], Match[1]);
						break;
					}
				}
			}
		}*/

		const urlObj = new URL(url);
		let filename = urlObj.pathname.split('/').pop() ?? 'untitled';

		const req = got.stream(url, {
			headers: {
				'User-Agent': this.config.userAgent,
				//"host": "rumiserver.com"
			},
			timeout: {
				lookup: timeout,
				connect: timeout,
				secureConnect: timeout,
				socket: timeout,	// read timeout
				response: timeout,
				send: timeout,
				request: operationTimeout,	// whole operation timeout
			},
			agent: {
				http: this.httpRequestService.httpAgent,
				https: this.httpRequestService.httpsAgent,
			},
			http2: false,	// default
			retry: {
				limit: 0,
			},
			enableUnixSockets: false,
		}).on('response', (res: Got.Response) => {
			const contentLength = res.headers['content-length'];
			if (contentLength != null) {
				const size = Number(contentLength);
				if (size > maxSize) {
					this.logger.warn(`maxSize exceeded (${size} > ${maxSize}) on response`);
					req.destroy();
				}
			}

			const contentDisposition = res.headers['content-disposition'];
			if (contentDisposition != null) {
				try {
					const parsed = parse(contentDisposition);
					if (parsed.parameters.filename) {
						filename = parsed.parameters.filename;
					}
				} catch (e) {
					this.logger.warn(`Failed to parse content-disposition: ${contentDisposition}`, { stack: e });
				}
			}
		}).on('downloadProgress', (progress: Got.Progress) => {
			if (progress.transferred > maxSize) {
				this.logger.warn(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
				req.destroy();
			}
		});

		try {
			await stream.pipeline(req, fs.createWriteStream(path));
		} catch (e) {
			if (e instanceof Got.HTTPError) {
				throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
			} else {
				throw e;
			}
		}

		this.logger.succ(`Download finished: ${chalk.cyan(url)}`);

		return {
			filename,
		};
	}

	@bindThis
	public async downloadTextFile(url: string): Promise<string> {
		// Create temp file
		const [path, cleanup] = await createTemp();

		this.logger.info(`text file: Temp file is ${path}`);

		try {
			// write content at URL to temp file
			await this.downloadUrl(url, path);

			const text = await fs.promises.readFile(path, 'utf8');

			return text;
		} finally {
			cleanup();
		}
	}
}
