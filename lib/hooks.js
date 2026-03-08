'use strict';

const db = require.main.require('./src/database');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const privileges = require.main.require('./src/privileges');


const Config = require('./config');
const Poll = require('./poll');

const Hooks = exports;

Hooks.filter = {};
Hooks.action = {};

Hooks.filter.configGet = async function (config) {
	config.poll = await Config.getSettings();
	return config;
};

Hooks.filter.registerFormatting = function (payload) {
	payload.options.push({
		name: 'poll',
		className: `fa ${Config.plugin.icon}`,
		title: '[[poll:creator_title]]',
		badge: true,
	});
	return payload;
};

Hooks.filter.composerPush = async function (hookData) {
	if (hookData.pid) {
		const pollIds = await Poll.getPollIdsByPid(hookData.pid);
		const polls = await Promise.all(pollIds.map(pollId => Poll.get(pollId, 0)));
		hookData.polls = polls.map(p => p && p.info).filter(Boolean);
	}
	return hookData;
};

Hooks.filter.postCreate = async function (hookData) {
	// post is going to be saved to db, data is what is submitted by user
	const { post, data } = hookData;
	if (Array.isArray(data?.polls) && data.polls.length) {
		await Poll.add(post, data.polls);
	}
	return hookData;
};

Hooks.filter.postGetFields = async function (hookData) {
	if (!hookData.fields.includes('pollIds')) {
		// when a new post is created it doesnt send pollIds to the client
		// force load pollIds so it is available when the client needs to load the poll data
		const postData = await db.getObjectsFields(hookData.pids.map(pid => `post:${pid}`), ['pollIds']);
		hookData.posts.forEach((post, index) => {
			if (post) {
				post.pollIds = postData[index].pollIds || '';
			}
		});
	}
	return hookData;
};

Hooks.filter.postEdit = async function (obj) {
	const { tid, pollId } = await posts.getPostFields(obj.data.pid, ['tid', 'pollId']);
	if (pollId) {
		return obj;
	}

	const result = await topics.getTopicFields(tid, ['mainPid', 'cid']);
	if (parseInt(result.mainPid, 10) !== parseInt(obj.data.pid, 10)) {
		return obj;
	}

	await canCreate(result.cid, obj.post.editor);

	const postData = await savePoll({
		...obj.post,
		uid: obj.data.uid,
		pid: obj.data.pid,
		tid: tid,
	});
	delete postData.uid;
	delete postData.pid;
	delete postData.tid;
	obj.post = postData;

	if (!postData.pollId) {
		return obj;
	}

	// NodeBB only updates the edited, editor and content fields, so we add the pollId field manually.
	await posts.setPostField(obj.data.pid, 'pollId', postData.pollId);
	return obj;
};

Hooks.filter.topicPost = async function (data) {
	if (Array.isArray(data.polls) && data.polls.length) {
		await canCreate(data.cid, data.uid);
	}
	return data;
};

Hooks.filter.topicReply = async function (data) {
	if (Array.isArray(data.polls) && data.polls.length) {
		const cid = await topics.getTopicField(data.tid, 'cid');
		await canCreate(cid, data.uid);
	}
	return data;
};

Hooks.action.postDelete = async function (data) {
	const pollIds = await Poll.getPollIdsByPid(data.post.pid);
	if (pollIds.length) {
		await Poll.delete(pollIds);
	}
};

Hooks.action.postRestore = async function (data) {
	const pollIds = await Poll.getPollIdsByPid(data.post.pid);
	if (pollIds.length) {
		await Poll.restore(pollIds);
	}
};

async function canCreate(cid, uid) {
	const can = await privileges.categories.can('poll:create', cid, uid);
	if (!can) {
		throw new Error('[[poll:error.privilege.create]]');
	}
}

