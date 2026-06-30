'use strict';

const db = nodebb.require('./src/database');
const privileges = nodebb.require('./src/privileges');

module.exports = {
	name: 'Fix incorrectly given poll privilege',
	timestamp: Date.UTC(2020, 9, 29),
	method: async () => {
		const cids = await db.getSortedSetRange('categories:cid', 0, -1);
		await Promise.all(cids.map(async (cid) => {
			await privileges.categories.rescind(['poll:create'], cid, ['registered-users']);
		}));
	},
};
