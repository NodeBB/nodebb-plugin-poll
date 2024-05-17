'use strict';

const NodeBB = require('./nodebb');

const Config = require('./config');
const Poll = require('./poll');
const Serializer = require('./serializer');

const Hooks = exports;

Hooks.filter = {};
Hooks.action = {};

Hooks.filter.parseRaw = function (raw) {
	return Serializer.removeMarkup(raw, '[Poll]');
};

Hooks.filter.postCreate = async function (obj) {
	if (Serializer.hasMarkup(obj.post.content) && obj.data.isMain) {
		return await savePoll(obj);
	}
	return obj;
};

Hooks.filter.postEdit = async function (obj) {
	const { tid, pollId } = await NodeBB.Posts.getPostFields(obj.data.pid, ['tid', 'pollId']);
	if (pollId || !Serializer.hasMarkup(obj.post.content)) {
		return obj;
	}

	const result = await NodeBB.Topics.getTopicFields(tid, ['mainPid', 'cid']);
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
	await NodeBB.Posts.setPostField(obj.data.pid, 'pollId', postData.pollId);
	return obj;
};

Hooks.filter.topicPost = async function (data) {
	if (Serializer.hasMarkup(data.content)) {
		await canCreate(data.cid, data.uid);
		return data;
	}
	return data;
};

Hooks.action.postDelete = async function (data) {
	const pollId = await Poll.getPollIdByPid(data.post.pid);
	if (pollId) {
		await Poll.delete(pollId);
	}
};

Hooks.action.postRestore = async function (data) {
	const pollId = await Poll.getPollIdByPid(data.post.pid);
	if (pollId) {
		await Poll.restore(pollId);
	}
};

Hooks.action.topicDelete = async function (data) {
	const pollId = await Poll.getPollIdByTid(data.topic.tid);
	if (pollId) {
		Poll.delete(pollId);
	}
};

Hooks.action.topicRestore = async function (data) {
	const pollId = await Poll.getPollIdByTid(data.topic.tid);
	if (pollId) {
		Poll.restore(pollId);
	}
};

async function canCreate(cid, uid) {
	const can = await NodeBB.Privileges.categories.can('poll:create', cid, uid);
	if (!can) {
		throw new Error('[[poll:error.privilege.create]]');
	}
}

async function savePoll(obj) {
	const postobj = obj.post ? obj.post : obj;
	const pollData = Serializer.serialize(postobj.content, Config.settings.get());

	if (!pollData || !pollData.options.length) {
		return obj;
	}

	const pollId = await Poll.add(pollData, postobj);

	postobj.pollId = pollId;
	postobj.content = Serializer.removeMarkup(postobj.content);

	return obj;
}

