'use strict';

const NodeBB = require('./nodebb');

const Config = require('./config');
const Poll = require('./poll');
const Vote = require('./vote');

(function (Sockets) {
	Sockets.getConfig = async function () {
		return Config.settings.get();
	};

	Sockets.get = async function (socket, data) {
		const allowAnon = Config.settings.get('toggles.allowAnon');

		if (!data) {
			throw new Error('[[poll:error.invalid_request_desc, request data is not defined]]');
		}
		if (isNaN(parseInt(data.pollId, 10))) {
			throw new Error('[[poll:error.invalid_request_desc, pollId is required]]');
		}
		if ((!socket.uid && !allowAnon)) {
			throw new Error('[[poll:error.invalid_request_desc, anonymous access is not allowed]]');
		}

		const pollId = parseInt(data.pollId, 10);
		const pollData = await Poll.get(pollId, socket.uid, !!socket.uid)
			.catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));

		if (!pollData.info.version) {
			throw new Error('[[poll:error.error.legacy_poll]]');
		}

		pollData.optionType = parseInt(pollData.settings.maxvotes, 10) > 1 ? 'checkbox' : 'radio';

		return pollData;
	};

	Sockets.vote = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('[[poll:error.need_login_to, vote]]');
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			throw new Error('[[poll:error.invalid_vote]]');
		}

		data.uid = socket.uid;

		const [canVote, optionsFilter, settings] = await Promise.all([
			Vote.canVote(data.uid, data.pollId),
			Poll.hasOptions(data.pollId, data.options),
			Poll.getSettings(data.pollId),
		]).catch(() => { throw new Error('[[poll:error.option_voted_or_invalid]]'); });

		// Filter the options on their existence
		data.options = data.options.filter((el, index) => optionsFilter[index]);

		// Give an error if there are too many votes
		if (data.options.length > parseInt(settings.maxvotes, 10)) {
			throw new Error(`[[poll:error.max_votes, ${settings.maxvotes}]]`);
		}

		if (!canVote || !data.options.length) {
			throw new Error('[[poll:error.option_voted_or_invalid]]');
		}

		await Vote.add(data).catch(() => { throw new Error('[[error.thrown_during, voting]]'); });

		const pollData = await Poll.get(data.pollId, socket.uid, false).catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));

		NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
	};

	Sockets.updateVote = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('[[poll:error.need_login_to, make changes]]');
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			throw new Error('[[poll:error.invalid_vote]]');
		}

		data.uid = socket.uid;

		const [canUpdateVote, optionsFilter, settings] = await Promise.all([
			Vote.canUpdateVote(data.uid, data.pollId),
			Poll.hasOptions(data.pollId, data.options),
			Poll.getSettings(data.pollId),
		]).catch((err) => { NodeBB.winston.error('[nodebb-plugin-poll]', err); throw new Error('[[poll:error.invalid_option]]'); });

		// Filter the options on their existence
		data.options = data.options.filter((el, index) => optionsFilter[index]);

		// Give an error if there are too many votes
		if (data.options.length > parseInt(settings.maxvotes, 10)) {
			throw new Error(`[[poll:error.max_votes, ${settings.maxvotes}]]`);
		}
		if (!canUpdateVote) {
			throw new Error('[[poll:error.vote_action, update]]');
		}
		if (!data.options.length) {
			throw new Error('[[poll:error.invalid_option]]');
		}

		await Vote.update(data).catch(() => { throw new Error('[[error.thrown_during, updating vote]]'); });
		const pollData = await Poll.get(data.pollId, socket.uid, false)
			.catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));

		NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
	};

	Sockets.removeVote = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('[[poll:error.need_login_to, make changes]]');
		}
		if (!data || isNaN(parseInt(data.pollId, 10))) {
			throw new Error('[[poll:error.invalid_request]]');
		}

		data.uid = socket.uid;

		const canUpdateVote = await Vote.canUpdateVote(data.uid, data.pollId)
			.catch((err) => { NodeBB.winston.error('[nodebb-plugin-poll]', err); throw new Error('[[poll:error.unexpected]]'); });

		if (!canUpdateVote) {
			throw new Error('[[poll:error.vote_action, remove]]');
		}

		await Vote.remove(data).catch(() => { throw new Error('[[error.thrown_during, removing vote]]'); });

		const pollData = await Poll.get(data.pollId, socket.uid, false)
			.catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));
		NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
	};

	Sockets.getOptionDetails = async function (socket, data) {
		if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.optionId, 10))) {
			throw new Error('[[poll:error.invalid_request]]');
		}

		const result = await Poll.getOption(data.pollId, data.optionId, true)
			.catch(() => { throw new Error('[[poll:error.unexpected]]'); });

		if (!result.votes || !result.votes.length) {
			return result;
		}

		const userData = await NodeBB.User.getUsersFields(result.votes, ['uid', 'username', 'userslug', 'picture'])
			.catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));
		result.votes = userData;
		return result;
	};

	Sockets.canCreate = async function (socket, data) {
		if (!socket.uid || !data || (isNaN(parseInt(data.cid, 10)) && isNaN(parseInt(data.pid, 10)))) {
			throw new Error('[[poll:error.invalid_request]]');
		}

		if (data.cid) {
			return checkPrivs(data.cid, socket.uid);
		}

		let cid;
		try {
			const tid = await NodeBB.Posts.getPostField(data.pid, 'tid');
			cid = await NodeBB.Topics.getTopicField(tid, 'cid');
		} catch (err) {
			NodeBB.winston.error('[nodebb-plugin-poll]', err);
			throw new Error('[[poll:error.invalid_request]]');
		}

		return checkPrivs(cid, socket.uid);
	};

	async function checkPrivs(cid, socketUid) {
		const can = await NodeBB.Privileges.categories.can('poll:create', cid, socketUid)
			.catch(() => { throw new Error('[[poll:error.privilege.create]]'); });

		if (!can) {
			throw new Error('[[poll:error.privilege.create]]');
		}

		return can;
	}
}(exports));
