'use strict';

// Poll-specific test fixtures. Kept out of core so the core test suite has no
// plugin-specific artifacts. Generic AP fixtures (note/create/mockRequests)
// still come from `nodebb.require('./test/activitypub/helpers')`.

const utils = nodebb.require('./src/utils');
const activitypub = nodebb.require('./src/activitypub');

const baseUrl = 'https://example.org';

module.exports = {
	// FEP-9967 `Question` (poll) object. Mirrors the core note() factory with
	// poll fields (oneOf/anyOf, endTime, votersCount). Caches the object in the
	// AP request cache so the inbox flow can fetch it without real requests.
	question: (override = {}) => {
		const uuid = utils.generateUUID();
		const id = `${baseUrl}/object/${uuid}`;
		const question = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id,
			url: id,
			type: 'Question',
			to: ['https://www.w3.org/ns/activitystreams#Public'],
			cc: [`${baseUrl}/user/foobar/followers`],
			inReplyTo: null,
			attributedTo: `${baseUrl}/user/foobar`,
			name: utils.generateUUID(),
			content: `<p>${utils.generateUUID()}</p>`,
			published: new Date().toISOString(),
			endTime: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(),
			oneOf: [
				{ type: 'Note', name: 'Option A', replies: { type: 'Collection', totalItems: 3 } },
				{ type: 'Note', name: 'Option B', replies: { type: 'Collection', totalItems: 7 } },
			],
			votersCount: 10,
			...override,
		};

		Object.entries(question).forEach(([key, value]) => {
			if (value === 'remove') {
				delete question[key];
			}
		});
		activitypub._cache.set(`0;${id}`, question);

		return { id, question };
	},
};
