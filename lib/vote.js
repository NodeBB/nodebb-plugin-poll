'use strict';

const NodeBB = require('./nodebb');
const Poll = require('./poll');

const Vote = exports;

Vote.add = async function (voteData) {
	const { pollId, options, uid } = voteData;
	const timestamp = +new Date();

	const promises = [
		NodeBB.db.sortedSetAdd(`poll:${pollId}:voters`, timestamp, uid),
		NodeBB.db.sortedSetAddBulk(
			options.map(option => ([`poll:${pollId}:options:${option}:votes`, timestamp, uid]))
		),
	];
	if (voteData.voteAnon) {
		promises.push(
			NodeBB.db.sortedSetAdd(`poll:${pollId}:anon:voters`, timestamp, uid)
		);
	}

	await Promise.all(promises);
};

Vote.remove = async function (voteData) {
	return await Vote.removeUidVote(voteData.uid, voteData.pollId);
};

Vote.get = async function (voteData) {
	return await Vote.getUidVote(voteData.uid, voteData.pollId);
};

Vote.removeUidVote = async function (uid, pollId) {
	const vote = await Vote.getUidVote(uid, pollId);
	const options = vote.options || [];
	await Promise.all([
		NodeBB.db.sortedSetsRemove([
			`poll:${pollId}:voters`,
			`poll:${pollId}:anon:voters`,
		], uid),
		NodeBB.db.sortedSetsRemove(
			options.map(option => `poll:${pollId}:options:${option}:votes`),
			uid,
		),
	]);
};

Vote.getUidVote = async function (uid, pollId) {
	const options = await Poll.getOptions(pollId, true);
	return {
		pollId: pollId,
		uid: uid,
		options: options
			.filter(option => option.votes.some(_uid => parseInt(_uid, 10) === parseInt(uid, 10)))
			.map(option => option.id),
	};
};

Vote.update = async function (voteData) {
	const { uid, pollId } = voteData;
	const isVotedAnon = await NodeBB.db.isSortedSetMember(`poll:${pollId}:anon:voters`, uid);
	await Vote.remove(voteData);
	voteData.voteAnon = isVotedAnon;
	await Vote.add(voteData);
};

Vote.canUpdateVote = async function (uid, pollId) {
	const [ended, deleted, updateDisabled] = await Promise.all([
		Poll.hasEnded(pollId),
		Poll.isDeleted(pollId),
		Poll.doesDisallowVoteUpdate(pollId),
	]);
	return !ended && !deleted && !updateDisabled;
};

Vote.canVote = async function (uid, pollId) {
	const [ended, deleted, hasVoted] = await Promise.all([
		Poll.hasEnded(pollId),
		Poll.isDeleted(pollId),
		Vote.hasUidVoted(uid, pollId),
	]);
	return !ended && !deleted && !hasVoted;
};

Vote.hasUidVoted = async function (uid, pollId) {
	const score = await NodeBB.db.sortedSetScore(`poll:${pollId}:voters`, uid);
	return !!score;
};

Vote.hasUidVotedOnOption = async function (uid, pollId, option) {
	const score = await NodeBB.db.sortedSetScore(`poll:${pollId}:options:${option}:votes`, uid);
	return !!score;
};

