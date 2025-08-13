import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
	return {
		nodeId: params.id
	};
};
