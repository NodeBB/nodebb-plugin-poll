'use strict';

const _ = require.main.require('lodash');
const NodeBB = require('./nodebb');

const Config = require('./config');
const Poll = require('./poll');
const Vote = require('./vote');

const Sockets = exports;

Sockets.getConfig = function (socket, data, callback) {
	callback(null, Config.settings.get());
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
	const pollData = await Poll.get(pollId, socket.uid, !!socket.uid);
	if (!pollData.info.version) {
		throw new Error('Legacy polls are not supported');
	}

	if (parseInt(pollData.settings.allowAnonVoting, 10) === 1) {
		await anonymizeVoters(socket.uid, data.pollId, pollData.options);
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
	]);

	// Filter the options on their existence
	data.options = data.options.filter((el, index) => optionsFilter[index]);

	// Give an error if there are too many votes
	if (data.options.length > parseInt(settings.maxvotes, 10)) {
		throw new Error(`You can only vote for ${settings.maxvotes} options on this poll.`);
	}

	if (data.voteAnon && parseInt(settings.allowAnonVoting, 10) !== 1) {
		throw new Error('[[poll:error.anon-voting-not-allowed]]');
	}

	if (!canVote || !data.options.length) {
		throw new Error('Already voted or invalid option');
	}

	await Vote.add(data);

	const pollData = await Poll.get(data.pollId, socket.uid, false);
	NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', { pollData, uid: socket.uid });
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
	]);

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

	await Vote.update(data);
	const pollData = await Poll.get(data.pollId, socket.uid, false);
	NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', { pollData, uid: socket.uid });
};

Sockets.removeVote = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('You need to be logged in to make changes');
	}
	if (!data || isNaN(parseInt(data.pollId, 10))) {
		throw new Error('Invalid request');
	}
	data.uid = socket.uid;

	const canUpdateVote = await Vote.canUpdateVote(data.uid, data.pollId);
	if (!canUpdateVote) {
		throw new Error('Can\'t remove vote');
	}

	await Vote.remove(data);
	const pollData = await Poll.get(data.pollId, socket.uid, false);
	NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', { pollData, uid: socket.uid });
};

Sockets.getOptionDetails = async function (socket, data) {
	if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.optionId, 10))) {
		throw new Error('Invalid request');
	}
	const [poll, settings, option] = await Promise.all([
		Poll.getInfo(data.pollId),
		Poll.getSettings(data.pollId),
		Poll.getOption(data.pollId, data.optionId, true),
	]);

	if (!option.votes || !option.votes.length) {
		return option;
	}

	if (parseInt(settings.allowAnonVoting, 10) === 1) {
		await anonymizeVoters(socket.uid, data.pollId, [option]);
	}

	const userData = await NodeBB.User.getUsersFields(option.votes, [
		'uid', 'username', 'userslug', 'picture',
	]);
	option.votes = userData;

	const result = await NodeBB.Plugins.hooks.fire('filter:poll.getOptionDetails', {
		poll,
		option,
	});
	return result.option;
};

Sockets.canCreate = async function (socket, data) {
	if (!socket.uid || !data || (isNaN(parseInt(data.cid, 10)) && isNaN(parseInt(data.pid, 10)))) {
		throw new Error('Invalid request');
	}

	if (!data.cid) {
		const tid = await NodeBB.Posts.getPostField(data.pid, 'tid');
		data.cid = await NodeBB.Topics.getTopicField(tid, 'cid');
	}
	return await checkPrivs(data.cid, socket.uid);
};

async function anonymizeVoters(callerUid, pollId, options) {
	const uids = _.uniq(options.map(opt => opt.votes).flat());
	const [isAnon, isPrivileged] = await Promise.all([
		NodeBB.db.isSortedSetMembers(`poll:${pollId}:anon:voters`, uids),
		NodeBB.User.isPrivileged(callerUid),
	]);
	if (isPrivileged) {
		return;
	}
	const uidToIsAnon = _.zipObject(uids, isAnon);
	options.forEach((opt) => {
		opt.votes = opt.votes.map(
			uid => (uidToIsAnon[uid] && String(callerUid) !== uid ? 0 : uid)
		);
	});
}

async function checkPrivs(cid, socketUid) {
	const can = await NodeBB.Privileges.categories.can('poll:create', cid, socketUid);
	if (!can) {
		throw new Error('[[poll:error.privilege.create]]');
	}
	return true;
}
