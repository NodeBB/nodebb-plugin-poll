'use strict';

const NodeBB = require('./nodebb');
const Poll = require('./poll');


(function (Vote) {
	Vote.add = async function (voteData) {
		const { pollId } = voteData;
		const { options } = voteData;
		const { uid } = voteData;
		const timestamp = Date.now();

		await Promise.all([
			...options.map(option => NodeBB.db.sortedSetAdd(`poll:${pollId}:options:${option}:votes`, timestamp, uid)),
			NodeBB.db.sortedSetAdd(`poll:${pollId}:voters`, timestamp, uid),
		]);

		return true;
	};

	Vote.remove = async function (voteData) {
		return Vote.removeUidVote(voteData.uid, voteData.pollId);
	};

	Vote.get = async function (voteData) {
		return Vote.getUidVote(voteData.uid, voteData.pollId);
	};

	Vote.removeUidVote = async function (uid, pollId) {
		const vote = await Vote.getUidVote(uid, pollId).catch(err => NodeBB.winston.error('[nodebb-plugin-poll]', err));

		await Promise.all([
			...(vote.options || []).map(option => NodeBB.db.sortedSetRemove(`poll:${pollId}:options:${option}:votes`, uid)),
			NodeBB.db.sortedSetRemove(`poll:${pollId}:voters`, uid),
		]);

		return true;
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
		await Vote.remove(voteData);
		await Vote.add(voteData);
	};

	Vote.canUpdateVote = async function (uid, pollId) {
		const [isEnded, isDeleted, disallowUpdate] = await Promise.all([
			Poll.hasEnded(pollId),
			Poll.isDeleted(pollId),
			Poll.doesDisallowVoteUpdate(pollId),
		]);
		return !isEnded && !isDeleted && !disallowUpdate;
	};

	Vote.canVote = async function (uid, pollId) {
		const [isEnded, isDeleted, alreadyVoted] = await Promise.all([
			Poll.hasEnded(pollId),
			Poll.isDeleted(pollId),
			Vote.hasUidVoted(uid, pollId),
		]);
		return !isEnded && !isDeleted && !alreadyVoted;
	};

	Vote.hasUidVoted = async function (uid, pollId) {
		const score = await NodeBB.db.sortedSetScore(`poll:${pollId}:voters`, uid);
		return !!score;
	};

	Vote.hasUidVotedOnOption = async function (uid, pollId, option) {
		const score = await NodeBB.db.sortedSetScore(`poll:${pollId}:options:${option}:votes`, uid);
		return !!score;
	};
}(exports));
