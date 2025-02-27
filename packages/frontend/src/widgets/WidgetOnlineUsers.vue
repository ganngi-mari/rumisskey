<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
	<div data-cy-mkw-onlineUsers :class="[{_panel: !widgetProps.transparent, [$style.pad]: !widgetProps.transparent }]">
		<div>
			動物-{{ number(onlineUsersCount) }}匹
			<div>
				<!--VueのForがこれらしい？-->
				<div v-for="User in OnlineUserList">
					<img :src="User.avatarUrl" style="width: 32px; height: 32px; vertical-align: middle;">
					<span style="color: #41b781; margin-left: 5cqmin;">
						{{ (function(){
							if (User.name != null) {
								return User.name;
							} else {
								return User.username;
							}
						})() }}
					</span>
				</div>
			</div>
		</div>
		<div>
			<div>オフライン-{{ number(onlineUsersCount) }}匹</div>
			<div>
				<!--VueのForがこれらしい？-->
				<div v-for="User in OfflineUserList">
					<img :src="User.avatarUrl" style="width: 32px; height: 32px; vertical-align: middle;">
					<span style="margin-left: 5cqmin;">
						{{ (function(){
							if (User.name != null) {
								return User.name;
							} else {
								return User.username;
							}
						})() }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useWidgetPropsManager, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import { GetFormResultType } from '@/scripts/form.js';
import { misskeyApi, misskeyApiGet } from '@/scripts/misskey-api.js';
import { useInterval } from '@@/js/use-interval.js';
import { i18n } from '@/i18n.js';
import number from '@/filters/number.js';

const name = 'onlineUsers';

const widgetPropsDef = {
	transparent: {
		type: 'boolean' as const,
		default: true,
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const { widgetProps, configure } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const onlineUsersCount = ref(0);
let OnlineUserList = [];
let OfflineUserList = [];

const tick = () => {
	misskeyApiGet('get-online-users-count').then(res => {
		onlineUsersCount.value = res.count;
		OnlineUserList = res.List.Online;
		OfflineUserList = res.List.Offline;
	});
};

useInterval(tick, 1000 * 15, {
	immediate: true,
	afterMounted: true,
});

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.root {
	text-align: center;

	&.pad {
		padding: 16px 0;
	}
}

.text {
	color: var(--MI_THEME-fgTransparentWeak);
}
</style>
