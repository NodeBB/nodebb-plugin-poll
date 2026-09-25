/**
 * FEP-9967 federated poll (Question) tests.
 *
 * Run from the NodeBB root: `npx mocha test/plugins-installed.js`
 * (the regular test runner picks these up too). The plugin is listed in
 * `config.json`'s `test_plugins` so its hooks are loaded for the ingestion
 * tests.
 */

'use strict';

/* globals describe, it, before, after */

const assert = require('assert');

const db = nodebb.require('./test/mocks/databasemock');
const install = nodebb.require('./src/install');
const user = nodebb.require('./src/user');
const posts = nodebb.require('./src/posts');
const activitypub = nodebb.require('./src/activitypub');
const utils = nodebb.require('./src/utils');
const helpers = nodebb.require('./test/activitypub/helpers');
const pollHelpers = require('./helpers');

const Poll = require('../lib/poll');

describe('nodebb-plugin-poll (FEP-9967 federated polls)', () => {
	let uid;

	before(async () => {
		// Serve AP objects from the cache (no real outbound requests)
		helpers.mocks.mockRequests();
		await install.giveWorldPrivileges();
		uid = await user.create({ username: utils.generateUUID() });
	});

	after(() => {
		helpers.mocks.restoreRequests();
	});

	describe('Ingestion', () => {
		it('should create a topic and a remote poll from a Create(Question)', async () => {
			const { question, id } = pollHelpers.question();
			const { activity } = helpers.mocks.create(question);

			await db.sortedSetAdd(`followersRemote:${question.attributedTo}`, Date.now(), uid);
			await activitypub.inbox.create({ body: activity });

			assert(await posts.exists(id));

			// A poll should have been created and linked to the post
			const pollIds = JSON.parse(await db.getObjectField(`post:${id}`, 'pollIds'));
			assert(pollIds, 'post should have pollIds');
			assert.strictEqual(pollIds.length, 1);

			const poll = await db.getObject(`poll:${pollIds[0]}`);
			assert(poll, 'poll object should exist');
			assert.strictEqual(parseInt(poll.remote, 10), 1, 'poll should be marked remote');

			const options = JSON.parse(poll.options);
			assert.strictEqual(options.length, 2);
			assert.strictEqual(options[0].title, 'Option A');
			assert.strictEqual(options[1].title, 'Option B');

			const remoteVotes = JSON.parse(poll.remoteVotes);
			assert.strictEqual(Object.keys(remoteVotes).length, 2);
			const totalVotes = Object.values(remoteVotes).reduce((sum, n) => sum + n, 0);
			assert.strictEqual(totalVotes, 10);
		});

		it('should expose the ingested vote counts via Poll.getInfo', async () => {
			const { question, id } = pollHelpers.question();
			const { activity } = helpers.mocks.create(question);

			await db.sortedSetAdd(`followersRemote:${question.attributedTo}`, Date.now(), uid);
			await activitypub.inbox.create({ body: activity });

			const pollIds = JSON.parse(await db.getObjectField(`post:${id}`, 'pollIds'));
			const info = await Poll.getInfo(pollIds[0]);
			assert.strictEqual(info.voteCount, 10);
			const optionA = info.options.find(o => o.title === 'Option A');
			const optionB = info.options.find(o => o.title === 'Option B');
			assert.strictEqual(optionA.voteCount, 3);
			assert.strictEqual(optionB.voteCount, 7);
		});
	});

	describe('Poll.createFromQuestion', () => {
		it('should build a remote poll with ingested counts', async () => {
			const { question } = pollHelpers.question();
			const ap = {
				oneOf: question.oneOf,
				endTime: question.endTime,
				votersCount: question.votersCount,
			};
			const poll = await Poll.createFromQuestion({
				pid: 'test-pid',
				uid: 1,
				timestamp: Date.now(),
			}, ap);

			assert.strictEqual(parseInt(poll.remote, 10), 1);
			const options = JSON.parse(poll.options);
			assert.strictEqual(options.length, 2);
			assert.strictEqual(options[0].title, 'Option A');
			assert.strictEqual(options[1].title, 'Option B');

			const info = await Poll.getInfo(poll.pollId);
			assert.strictEqual(info.voteCount, 10);
			const optionA = info.options.find(o => o.title === 'Option A');
			const optionB = info.options.find(o => o.title === 'Option B');
			assert.strictEqual(optionA.voteCount, 3);
			assert.strictEqual(optionB.voteCount, 7);
		});

		it('should treat anyOf as multi-select', async () => {
			const { question } = pollHelpers.question();
			const ap = {
				anyOf: question.oneOf,
				endTime: question.endTime,
				votersCount: question.votersCount,
			};
			const poll = await Poll.createFromQuestion({
				pid: 'test-pid',
				uid: 1,
				timestamp: Date.now(),
			}, ap);

			assert.strictEqual(parseInt(poll.remote, 10), 1);
			assert.strictEqual(parseInt(poll.maximumVotesPerUser, 10), 2, 'anyOf should allow multiple votes');
		});
	});

	describe('Poll.updateFromQuestion', () => {
		it('should refresh ingested counts', async () => {
			const { question } = pollHelpers.question();
			const ap = {
				oneOf: question.oneOf,
				endTime: question.endTime,
				votersCount: question.votersCount,
			};
			const poll = await Poll.createFromQuestion({
				pid: 'test-pid',
				uid: 1,
				timestamp: Date.now(),
			}, ap);

			const updatedAp = {
				oneOf: [
					{ type: 'Note', name: 'Option A', replies: { type: 'Collection', totalItems: 5 } },
					{ type: 'Note', name: 'Option B', replies: { type: 'Collection', totalItems: 12 } },
				],
				endTime: question.endTime,
				votersCount: 17,
			};
			await Poll.updateFromQuestion(poll.pollId, updatedAp);

			const info = await Poll.getInfo(poll.pollId);
			assert.strictEqual(info.voteCount, 17);
			const optionA = info.options.find(o => o.title === 'Option A');
			const optionB = info.options.find(o => o.title === 'Option B');
			assert.strictEqual(optionA.voteCount, 5);
			assert.strictEqual(optionB.voteCount, 12);
		});
	});

	describe('Outbound Question serialization (filter:activitypub.mocks.note)', () => {
		const Plugin = require('../library');

		it('should transform a post with a single-choice poll into a Question', async () => {
			const pid = `test-pid-${utils.generateUUID()}`;
			const end = Date.now() + (24 * 60 * 60 * 1000);
			const poll = await Poll.add({ pid, uid: 1, timestamp: Date.now() }, [{
				title: 'Test poll',
				end,
				maximumVotesPerUser: 1,
				options: [
					{ id: '1', title: 'Option A' },
					{ id: '2', title: 'Option B' },
				],
			}]);
			await db.setObjectField(`post:${pid}`, 'pollIds', JSON.stringify(poll.map(p => String(p.pollId))));

			// One vote on Option A so votersCount > 0
			await db.sortedSetAdd(`poll:${poll[0].pollId}:options:1:votes`, Date.now(), 'voter-1');
			await db.sortedSetAdd(`poll:${poll[0].pollId}:voters`, Date.now(), 'voter-1');

			// Simulate the object Mocks.notes.public builds for a main post (an Article)
			const object = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://example.org/post/123',
				type: 'Article',
				name: 'Test topic title',
				content: '<p>Test poll</p>',
				preview: { type: 'Note', content: '<p>Test poll</p>' },
				summary: 'Test poll [...]',
				sensitive: false,
			};

			const result = await Plugin.hooks.filter.activitypubMocksNote({ object, post: { pid } });

			assert.strictEqual(result.object.type, 'Question');
			assert(result.object.oneOf, 'should have oneOf');
			assert.strictEqual(result.object.oneOf.length, 2);
			assert.strictEqual(result.object.oneOf[0].name, 'Option A');
			assert.strictEqual(result.object.oneOf[0].replies.totalItems, 1, 'Option A should have 1 vote');
			assert.strictEqual(result.object.oneOf[1].name, 'Option B');
			assert.strictEqual(result.object.oneOf[1].replies.totalItems, 0, 'Option B should have 0 votes');
			assert(result.object.endTime, 'should have endTime');
			assert.strictEqual(result.object.votersCount, 1, 'should have votersCount');
			assert.strictEqual(result.object.name, 'Test topic title', 'name should be kept');
			assert.strictEqual(result.object.preview, undefined, 'preview should be dropped');
			assert.strictEqual(result.object.summary, undefined, 'summary should be dropped');
			assert.strictEqual(result.object.sensitive, undefined, 'sensitive should be dropped');
		});

		it('should use anyOf for a multi-choice poll and omit endTime when open', async () => {
			const pid = `test-pid-${utils.generateUUID()}`;
			const poll = await Poll.add({ pid, uid: 1, timestamp: Date.now() }, [{
				title: 'Test poll',
				end: 0,
				maximumVotesPerUser: 3,
				options: [
					{ id: '1', title: 'Option A' },
					{ id: '2', title: 'Option B' },
					{ id: '3', title: 'Option C' },
				],
			}]);
			await db.setObjectField(`post:${pid}`, 'pollIds', JSON.stringify(poll.map(p => String(p.pollId))));

			const object = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://example.org/post/456',
				type: 'Note',
				content: '<p>Test poll</p>',
			};

			const result = await Plugin.hooks.filter.activitypubMocksNote({ object, post: { pid } });

			assert.strictEqual(result.object.type, 'Question');
			assert(result.object.anyOf, 'should have anyOf');
			assert.strictEqual(result.object.anyOf.length, 3);
			assert.strictEqual(result.object.oneOf, undefined, 'should not have oneOf');
			assert.strictEqual(result.object.endTime, undefined, 'should not have endTime (open poll)');
			assert.strictEqual(result.object.closed, undefined, 'should not have closed (open poll)');
		});

		it('should leave a post without polls untouched', async () => {
			const pid = `test-pid-${utils.generateUUID()}`;
			const object = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://example.org/post/789',
				type: 'Note',
				content: '<p>No poll</p>',
			};

			const result = await Plugin.hooks.filter.activitypubMocksNote({ object, post: { pid } });

			assert.strictEqual(result.object.type, 'Note', 'type should be unchanged');
			assert.strictEqual(result.object.oneOf, undefined);
			assert.strictEqual(result.object.anyOf, undefined);
		});
	});
});
