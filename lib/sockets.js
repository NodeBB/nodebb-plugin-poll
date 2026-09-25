'use strict';

const nconf = nodebb.require('nconf');
const _ = nodebb.require('lodash');
const db = nodebb.require('./src/database');
const posts = nodebb.require('./src/posts');
const topics = nodebb.require('./src/topics');
const privileges = nodebb.require('./src/privileges');

const NodeBB = require('./nodebb');
const Config = require('./config');
const Poll = require('./poll');
const Vote = require('./vote');

const Sockets = exports;

Sockets.get = async function (socket, data) {
	const settings = await Config.getSettings();
	const allowAnon = !!settings.allowGuestsToViewResults;

	if (!data) {
		throw new Error('Invalid request, request data is not defined');
	}
	if (!Array.isArray(data.pollIds) || !data.pollIds.length) {
		throw new Error('Invalid request, pollId is required');
	}
	if (!socket.uid && !allowAnon) {
		return [];
	}
	return await Promise.all(data.pollIds.map(async (pollId) => {
		const withVotes = !!socket.uid;
		const pollData = await Poll.get(pollId, socket.uid, withVotes);
		if (!pollData) {
			return null;
		}

		if (withVotes && parseInt(pollData.info.allowAnonVoting, 10) === 1) {
			await anonymizeVoters(socket.uid, pollId, pollData.options);
		}

		pollData.optionType = parseInt(pollData.info.maximumVotesPerUser, 10) > 1 ? 'checkbox' : 'radio';
		return pollData;
	}));
};

Sockets.vote = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('You need to be logged in to vote');
	}
	if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
		throw new Error('Invalid vote');
	}

	data.uid = socket.uid;

	const [pollData, canVote, optionsFilter] = await Promise.all([
		db.getObject(`poll:${data.pollId}`),
		Vote.canVote(socket.uid, data.pollId),
		Poll.hasOptions(data.pollId, data.options),
	]);

	// Filter the options on their existence
	data.options = data.options.filter((el, index) => optionsFilter[index]);

	// Give an error if there are too many votes
	if (data.options.length > parseInt(pollData.maximumVotesPerUser, 10)) {
		throw new Error(`You can only vote for ${pollData.maximumVotesPerUser} options on this poll.`);
	}

	if (data.voteAnon && parseInt(pollData.allowAnonVoting, 10) !== 1) {
		throw new Error('[[poll:error.anon-voting-not-allowed]]');
	}

	if (!canVote || !data.options.length) {
		throw new Error('Already voted or invalid option');
	}

	await Vote.add(data);

	// Federate the vote out (FEP-9967) if this is a remote poll
	if (parseInt(pollData.remote, 10) === 1) {
		await federateVoteChange({ pollData, socket, voteAnon: data.voteAnon, removedOptionIds: [], addedOptionIds: data.options });
	}

	const returnPoll = await Poll.get(data.pollId, socket.uid, false);
	NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', {
		pollData: returnPoll,
		uid: socket.uid,
	});
};

Sockets.updateVote = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('You need to be logged in to make changes');
	}
	if (!data || isNaN(parseInt(data.pollId, 10)) || !data.options || !data.options.length) {
		throw new Error('Invalid vote');
	}
	data.uid = socket.uid;

	const [pollData, canUpdateVote, optionsFilter] = await Promise.all([
		db.getObject(`poll:${data.pollId}`),
		Vote.canUpdateVote(socket.uid, data.pollId),
		Poll.hasOptions(data.pollId, data.options),
	]);

	// Filter the options on their existence
	data.options = data.options.filter((el, index) => optionsFilter[index]);

	// Give an error if there are too many votes
	if (data.options.length > parseInt(pollData.maximumVotesPerUser, 10)) {
		throw new Error(`You can only vote for ${pollData.maximumVotesPerUser} options on this poll.`);
	}

	if (!canUpdateVote) {
		throw new Error('Can\'t update vote');
	}

	if (!data.options.length) {
		throw new Error('Invalid option');
	}

	// Capture the prior vote so we can federate the diff (remote polls only)
	const isRemote = parseInt(pollData.remote, 10) === 1;
	const oldOptions = isRemote ? (await Vote.get({ uid: socket.uid, pollId: data.pollId })).options : [];

	await Vote.update(data);

	// Federate the vote change out (FEP-9967) if this is a remote poll
	if (isRemote) {
		const oldSet = oldOptions.map(String);
		const removedOptionIds = oldOptions.filter(id => !data.options.map(String).includes(String(id)));
		const addedOptionIds = data.options.filter(id => !oldSet.includes(String(id)));
		await federateVoteChange({ pollData, socket, voteAnon: data.voteAnon, removedOptionIds, addedOptionIds });
	}

	const returnPoll = await Poll.get(data.pollId, socket.uid, false);
	NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', {
		pollData: returnPoll,
		uid: socket.uid,
	});
};

Sockets.removeVote = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('You need to be logged in to make changes');
	}
	if (!data || isNaN(parseInt(data.pollId, 10))) {
		throw new Error('Invalid request');
	}
	data.uid = socket.uid;

	const canUpdateVote = await Vote.canUpdateVote(socket.uid, data.pollId);
	if (!canUpdateVote) {
		throw new Error('Can\'t remove vote');
	}

	const pollData = await db.getObject(`poll:${data.pollId}`);
	const isRemote = parseInt(pollData.remote, 10) === 1;
	// Capture the prior vote + anon flag before removal (remote polls only)
	const oldOptions = isRemote ? (await Vote.get({ uid: socket.uid, pollId: data.pollId })).options : [];
	const voteAnon = isRemote ? await db.isSortedSetMember(`poll:${data.pollId}:anon:voters`, socket.uid) : false;

	await Vote.remove(data);

	// Federate the vote removal out (FEP-9967) if this is a remote poll
	if (isRemote) {
		await federateVoteChange({ pollData, socket, voteAnon, removedOptionIds: oldOptions, addedOptionIds: [] });
	}

	const returnPoll = await Poll.get(data.pollId, socket.uid, false);
	NodeBB.SocketIndex.server.sockets.emit('event:poll.voteChange', {
		pollData: returnPoll,
		uid: socket.uid,
	});
};

Sockets.getOptionDetails = async function (socket, data) {
	if (!socket.uid || !data || isNaN(parseInt(data.pollId, 10)) || isNaN(parseInt(data.optionId, 10))) {
		throw new Error('Invalid request');
	}
	const [poll, option] = await Promise.all([
		Poll.getInfo(data.pollId),
		Poll.getOption(data.pollId, data.optionId, true),
	]);
	if (!poll) {
		throw new Error('[[error:invalid-data]]');
	}
	const canRead = await privileges.posts.can('topics:read', poll.pid, socket.uid);
	if (!canRead) {
		throw new Error('[[error:no-privileges]]');
	}
	if (!option || !option.votes || !option.votes.length) {
		return option;
	}

	if (parseInt(poll.allowAnonVoting, 10) === 1) {
		await anonymizeVoters(socket.uid, data.pollId, [option]);
	}

	const userData = await NodeBB.User.getUsersFields(option.votes, [
		'uid', 'username', 'userslug', 'picture', 'displayname', 'icon:text', 'icon:bgColor',
	]);
	option.votes = userData;

	const result = await NodeBB.Plugins.hooks.fire('filter:poll.getOptionDetails', {
		poll,
		option,
	});
	return result.option;
};

Sockets.canCreate = async function (socket, data) {
	if (!socket.uid || !data) {
		throw new Error('Invalid request');
	}
	let { cid, tid, pid } = data;
	if (pid) {
		cid = await posts.getCidByPid(pid);
	} else if (tid) {
		cid = await topics.getTopicField(tid, 'cid');
	}
	return await checkPrivs(cid, socket.uid);
};

async function anonymizeVoters(callerUid, pollId, options) {
	const uids = _.uniq(options.map(opt => opt.votes).flat());
	const [isAnon, isPrivileged] = await Promise.all([
		db.isSortedSetMembers(`poll:${pollId}:anon:voters`, uids),
		NodeBB.User.isPrivileged(callerUid),
	]);
	if (isPrivileged) {
		return;
	}
	const uidToIsAnon = _.zipObject(uids, isAnon);
	options.forEach((opt) => {
		opt.votes = (opt.votes || []).map(
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

// ---------------------------------------------------------------------------
// FEP-9967 outbound vote federation
// ---------------------------------------------------------------------------

// Build a FEP-9967 vote Note. Stable, idempotent id so re-sends and Undos
// dedupe remotely.
function buildVoteNote({ voterUrl, questionId, optionName, pollAuthorUrl }) {
	const voteId = `${voterUrl}#activity/vote/${encodeURIComponent(questionId)}/${encodeURIComponent(optionName)}`;
	return {
		id: voteId,
		type: 'Note',
		attributedTo: voterUrl,
		inReplyTo: questionId,
		name: optionName,
		to: [pollAuthorUrl],
	};
}

// Federate a vote change (additions and/or removals) for a remote poll.
// Anonymous votes are not federated (FEP votes are attributed to the voter
// actor, which anon votes lack).
async function federateVoteChange({ pollData, socket, voteAnon, removedOptionIds, addedOptionIds }) {
	if (voteAnon) {
		return;
	}
	if (!removedOptionIds.length && !addedOptionIds.length) {
		return;
	}

	const activitypub = nodebb.require('./src/activitypub');
	const options = JSON.parse(pollData.options || '[]');
	const [questionId, pollAuthorUrl] = await Promise.all([
		posts.getPostField(pollData.pid, 'url'), // remote Question id (a URL)
		posts.getPostField(pollData.pid, 'uid'),  // remote actor URL (poll author)
	]);
	const voterUrl = `${nconf.get('url')}/uid/${socket.uid}`;

	const toName = (id) => {
		const opt = options.find(o => String(o.id) === String(id));
		return opt ? opt.title : null;
	};

	// Undo removed options
	for (const id of removedOptionIds) {
		const name = toName(id);
		if (!name) continue;
		const voteNote = buildVoteNote({ voterUrl, questionId, optionName: name, pollAuthorUrl });
		// eslint-disable-next-line no-await-in-loop
		await activitypub.send('uid', socket.uid, [pollAuthorUrl], {
			id: `${voteNote.id}#undo`,
			type: 'Undo',
			object: {
				id: voteNote.id,
				type: 'Create',
				actor: voterUrl,
				object: voteNote,
			},
		});
	}

	// Create added options
	for (const id of addedOptionIds) {
		const name = toName(id);
		if (!name) continue;
		const voteNote = buildVoteNote({ voterUrl, questionId, optionName: name, pollAuthorUrl });
		// eslint-disable-next-line no-await-in-loop
		await activitypub.send('uid', socket.uid, [pollAuthorUrl], {
			id: voteNote.id,
			type: 'Create',
			object: voteNote,
		});
	}
}
