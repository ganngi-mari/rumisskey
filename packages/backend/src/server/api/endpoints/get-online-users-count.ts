/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { MoreThan } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { USER_ONLINE_THRESHOLD } from '@/const.js';
import { MiUser, type UsersRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';

export const meta = {
	tags: ['meta'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 60 * 1,
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			count: {
				type: 'number',
				nullable: false,
			},
			List: {
				type: "object",
				nullable: false
			}
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,
		private userEntityService: UserEntityService
	) {
		super(meta, paramDef, async () => {
			const OnlineList = await this.usersRepository.find({where: {}});
			let OnlineCount = 0;
			let OfflineCount = 0;
			let UserList = {
				Online: [],
				Offline: []
			};

			for (let I = 0; I < OnlineList.length; I++) {
				const User = await this.userEntityService.pack(OnlineList[I].id);
				if (User.onlineStatus === "online") {
					//オンラインなユーザー
					UserList.Online.push(User);
					OnlineCount++;
				} else {
					//オフラインなユーザー
					UserList.Offline.push(User);
					OfflineCount++;
				}
			}

			return {
				count: OnlineCount,
				List: UserList
			};
		});
	}
}
