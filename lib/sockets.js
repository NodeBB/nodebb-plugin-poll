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
			throw new Error('Invalid request, request data is not defined');
		}
		if (isNaN(parseInt(data.pollId, 10))) {
			throw new Error('Invalid request, pollId is required');
		}
		if ((!socket.uid && !allowAnon)) {
			throw new Error('Invalid request, anonymous access is not allowed');
		}

		const pollId = parseInt(data.pollId, 10);
		const pollData = await Poll.get(pollId, socket.uid, !!socket.uid)
			.catch(err => NodeBB.winston.error(err));

		if (!pollData.info.version) {
			throw new Error('Legacy polls are not supported');
		}

		pollData.optionType = parseInt(pollData.settings.maxvotes, 10) > 1 ? 'checkbox' : 'radio';

		return pollData;
	};

	Sockets.vote = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('You need to be logged in to vote');
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			throw new Error('Invalid vote');
		}

		data.uid = socket.uid;

		const [canVote, optionsFilter, settings] = await Promise.all([
			Vote.canVote(data.uid, data.pollId),
			Poll.hasOptions(data.pollId, data.options),
			Poll.getSettings(data.pollId),
		]).catch(() => { throw new Error('Already voted or invalid option'); });

		// Filter the options on their existence
		data.options = data.options.filter((el, index) => optionsFilter[index]);

		// Give an error if there are too many votes
		if (data.options.length > parseInt(settings.maxvotes, 10)) {
			throw new Error(`You can only vote for ${settings.maxvotes} options on this poll.`);
		}

		if (!canVote || !data.options.length) {
			throw new Error('Already voted or invalid option');
		}

		await Vote.add(data).catch(() => { throw new Error('Error during voting'); });

		const pollData = await Poll.get(data.pollId, socket.uid, false).catch(err => NodeBB.winston.error(err));

		NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
	};

	Sockets.updateVote = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('You need to be logged in to make changes');
		}
		if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
			throw new Error('Invalid vote');
		}

		data.uid = socket.uid;

		const [canUpdateVote, optionsFilter, settings] = await Promise.all([
			Vote.canUpdateVote(data.uid, data.pollId),
			Poll.hasOptions(data.pollId, data.options),
			Poll.getSettings(data.pollId),
		]).catch((err) => { NodeBB.winston.error(err); throw new Error('Invalid option'); });

		// Filter the options on their existence
		data.options = data.options.filter((el, index) => optionsFilter[index]);

		// Give an error if there are too many votes
		if (data.options.length > parseInt(settings.maxvotes, 10)) {
			throw new Error(`You can only vote for ${settings.maxvotes} options on this poll.`);
		}
		if (!canUpdateVote) {
			throw new Error('Can\'t update vote');
		}
		if (!data.options.length) {
			throw new Error('Invalid option');
		}

		await Vote.update(data).catch(() => { throw new Error('Error during updating vote'); });
		const pollData = await Poll.get(data.pollId, socket.uid, false).catch(err => NodeBB.winston.error(err));

		NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
	};

	Sockets.removeVote = async function (socket, data) {
		if (!socket.uid) {
			throw new Error('You need to be logged in to make changes');
		}
		if (!data || isNaN(parseInt(data.pollId, 10))) {
			throw new Error('Invalid request');
		}

		data.uid = socket.uid;

		const canUpdateVote = await Vote.canUpdateVote(data.uid, data.pollId)
			.catch((err) => { NodeBB.winston.error(err); throw new Error('Something went wrong'); });

		if (!canUpdateVote) {
			throw new Error('Can\'t remove vote');
		}

		await Vote.remove(data).catch(() => { throw new Error('Error during removing vote'); });

		const pollData = await Poll.get(data.pollId, socket.uid, false).catch(err => NodeBB.winston.error(err));
		NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', pollData);
	};

	Sockets.getOptionDetails = async function (socket, data) {
		if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.optionId, 10))) {
			throw new Error('Invalid request');
		}

		const result = await Poll.getOption(data.pollId, data.optionId, true)
			.catch(() => { throw new Error('Something went wrong!'); });

		if (!result.votes || !result.votes.length) {
			return result;
		}

		const userData = await NodeBB.User.getUsersFields(result.votes, ['uid', 'username', 'userslug', 'picture'])
			.catch(err => NodeBB.winston.error(err));
		result.votes = userData;
		return result;
	};

	Sockets.canCreate = async function (socket, data) {
		if (!socket.uid || !data || (isNaN(parseInt(data.cid, 10)) && isNaN(parseInt(data.pid, 10)))) {
			throw new Error('Invalid request');
		}

		if (data.cid) {
			return checkPrivs(data.cid, socket.uid);
		}

		let cid;
		try {
			const tid = await NodeBB.Posts.getPostField(data.pid, 'tid');
			cid = await NodeBB.Topics.getTopicField(tid, 'cid');
		} catch (err) {
			NodeBB.winston.error(err);
			throw new Error('Invalid request');
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
