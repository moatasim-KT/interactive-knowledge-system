// @ts-nocheck
import type { LayoutLoad } from './$types';

export const load = async ({ params }: Parameters<LayoutLoad>[0]) => {
	return {
		nodeId: params.id
	};
};
