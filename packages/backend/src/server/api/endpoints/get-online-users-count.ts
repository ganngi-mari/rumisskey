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
			const Limit = 100;
			const OnlineDate = new Date(Date.now() - USER_ONLINE_THRESHOLD);

			//ユーザー取得
			const OnlineList = await this.usersRepository.createQueryBuilder('user')
									.where("user.isExplorable = TRUE")
									.andWhere("user.isSuspended = FALSE")
									.andWhere("user.lastActiveDate > :date", {date: OnlineDate})
									.limit(Limit)
									.getMany();
			const OfflineList = await this.usersRepository.createQueryBuilder('user')
									.where("user.isExplorable = TRUE")
									.andWhere("user.isSuspended = FALSE")
									.andWhere("user.lastActiveDate < :date", {date: OnlineDate})
									.limit(Limit)
									.getMany();

			let OnlineCount = 0;
			let OfflineCount = 0;
			let UserList = {
				Online: [],
				Offline: []
			};

			//オンラインユーザーを集計
			for (let I = 0; I < OnlineList.length; I++) {
				const User = await this.userEntityService.pack(OnlineList[I].id);
				UserList.Online.push(User);
				OnlineCount++;
			}

			//オフラインユーザーを集計
			for (let I = 0; I < OfflineList.length; I++) {
				const User = await this.userEntityService.pack(OfflineList[I].id);
				UserList.Offline.push(User);
				OfflineCount++;
			}

			return {
				count: OnlineCount,
				List: UserList
			};
		});
	}
}
