'use strict';

const util = require('util');
const NodeBB = require('./nodebb');

const Config = require('./config');
const Poll = require('./poll');
const Serializer = require('./serializer');


(function (Hooks) {
	Hooks.filter = {};
	Hooks.action = {};

	Hooks.filter.parseRaw = function (raw, callback) {
		callback(null, Serializer.removeMarkup(raw, '[Poll]'));
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

	Hooks.action.postDelete = function (data) {
		Poll.getPollIdByPid(data.post.pid, (err, pollId) => {
			if (err) {
				console.error(err);
			}
			if (pollId) {
				Poll.delete(pollId);
			}
		});
	};

	Hooks.action.postRestore = function (data) {
		Poll.getPollIdByPid(data.post.pid, (err, pollId) => {
			if (err) {
				console.error(err);
			}
			if (pollId) {
				Poll.restore(pollId);
			}
		});
	};

	Hooks.action.topicDelete = function (data) {
		Poll.getPollIdByTid(data.topic.tid, (err, pollId) => {
			if (err) {
				console.error(err);
			}
			if (pollId) {
				Poll.delete(pollId);
			}
		});
	};

	Hooks.action.topicRestore = function (data) {
		Poll.getPollIdByTid(data.topic.tid, (err, pollId) => {
			if (err) {
				console.error(err);
			}
			if (pollId) {
				Poll.restore(pollId);
			}
		});
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

		const addPoll = util.promisify(Poll.add);
		const pollId = await addPoll(pollData, postobj);

		postobj.pollId = pollId;
		postobj.content = Serializer.removeMarkup(postobj.content);

		return obj;
	}
}(exports));
