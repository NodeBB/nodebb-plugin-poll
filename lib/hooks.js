'use strict';

const db = nodebb.require('./src/database');
const topics = nodebb.require('./src/topics');
const posts = nodebb.require('./src/posts');
const privileges = nodebb.require('./src/privileges');


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
		title: '[[poll:manage-polls]]',
		badge: true,
	});
	return payload;
};

Hooks.filter.composerPush = async function (hookData) {
	// used for editing, add the polls so they are avable in composer
	if (hookData.pid) {
		const callerUid = hookData?.caller?.uid || 0;
		const pollIds = await Poll.getPollIdsByPid(hookData.pid);
		const polls = await Promise.all(pollIds.map(pollId => Poll.get(pollId, callerUid)));
		hookData.polls = polls.map(p => p && p.info).filter(Boolean);
	}
	return hookData;
};

Hooks.filter.postCreate = async function (hookData) {
	// post is going to be saved to db, data is what is submitted by user
	const { post, data } = hookData;
	if (Array.isArray(data?.polls) && data.polls.length) {
		const savedPolls = await Poll.add(post, data.polls);
		if (savedPolls.length) {
			post.pollIds = JSON.stringify(savedPolls.map(p => String(p.pollId)));
		}
	}

	// Federated Question (FEP-9967): build a remote poll from the AP data
	const ap = data?._activitypub;
	if (ap && (Array.isArray(ap.oneOf) || Array.isArray(ap.anyOf))) {
		const saved = await Poll.createFromQuestion(post, ap);
		const existing = post.pollIds ? JSON.parse(post.pollIds) : [];
		post.pollIds = JSON.stringify([...existing, String(saved.pollId)]);
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

Hooks.filter.postEdit = async function (hookData) {
	// Federated Question update (FEP-9967): refresh the existing remote poll
	const ap = hookData.data?._activitypub;
	if (ap && (Array.isArray(ap.oneOf) || Array.isArray(ap.anyOf))) {
		const currentPollIds = await Poll.getPollIdsByPid(hookData.data.pid);
		let remotePollId = null;
		for (const pid of currentPollIds) {
			// eslint-disable-next-line no-await-in-loop
			if (await Poll.isRemote(pid)) {
				remotePollId = pid;
				break;
			}
		}
		if (remotePollId) {
			await Poll.updateFromQuestion(remotePollId, ap);
		} else {
			// No existing poll (e.g. the initial Create was missed); create one
			const saved = await Poll.createFromQuestion({
				uid: hookData.data.uid,
				pid: hookData.data.pid,
				timestamp: hookData.data.timestamp,
				edited: hookData.data.edited,
			}, ap);
			hookData.post.pollIds = JSON.stringify([String(saved.pollId)]);
		}
		return hookData;
	}

	const currentPollIds = await Poll.getPollIdsByPid(hookData.data.pid);
	if (!currentPollIds.length && (!Array.isArray(hookData.data.polls) || !hookData.data.polls.length)) {
		// no polls before or after, nothing to do
		return hookData;
	}
	const pollData = hookData.data.polls || [];
	const toAdd = pollData.filter(p => !currentPollIds.includes(String(p.pollId)));

	if (toAdd.length) {
		const cid = await posts.getCidByPid(hookData.data.pid, 'cid');
		await canCreate(cid, hookData.data.uid);
	}

	await Poll.edit({
		...hookData.post,
		uid: hookData.data.uid,
		pid: hookData.data.pid,
	}, pollData);
	hookData.post.pollIds = JSON.stringify(pollData.map(p => String(p.pollId)));
	return hookData;
};

// FEP-9967 outbound: transform a local post with a poll into a `Question`
// object. Fired at the end of `Mocks.notes.public` (core), which has already
// built a `Note`/`Article`. Only the first poll on a post is federated.
Hooks.filter.activitypubMocksNote = async function (hookData) {
	const { object, post } = hookData;
	if (!object || !post || !post.pid) {
		return hookData;
	}

	const pollIds = await Poll.getPollIdsByPid(post.pid);
	if (!pollIds.length) {
		return hookData;
	}

	const pollId = pollIds[0];
	const [info, votersCount] = await Promise.all([
		Poll.getInfo(pollId),
		Poll.getVotersCount(pollId),
	]);
	if (!info || !Array.isArray(info.options) || !info.options.length) {
		return hookData;
	}

	const options = info.options
		.filter(opt => opt && typeof opt.title === 'string')
		.map(opt => ({
			type: 'Note',
			name: opt.title,
			replies: { type: 'Collection', totalItems: opt.voteCount || 0 },
		}));

	const isMulti = parseInt(info.maximumVotesPerUser, 10) > 1;
	const end = parseInt(info.end, 10);
	const ended = end > 0 && Date.now() > end;

	object.type = 'Question';
	if (isMulti) {
		object.anyOf = options;
	} else {
		object.oneOf = options;
	}
	if (end > 0) {
		object.endTime = new Date(end).toISOString();
	}
	if (ended) {
		object.closed = true;
	}
	if (votersCount > 0) {
		object.votersCount = votersCount;
	}

	// A poll post is a Note, not an Article — drop the Article-only fields.
	// `name` (topic title) is kept: harmless and non-conflicting.
	delete object.preview;
	delete object.summary;
	delete object.sensitive;

	return hookData;
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

// FEP-9967 inbound: detect a remote vote on a local poll and apply it.
// A vote is a Create(Note) where the Note has `name` + `inReplyTo` and no
// `content`, and `inReplyTo` resolves to a local post that has a poll.
Hooks.filter.activitypubCreate = async function (hookData) {
	const { activity } = hookData;
	if (!activity || activity.type !== 'Create' || !activity.object) {
		return hookData;
	}

	const { object } = activity;
	// FEP-9967 vote shape: Note with name + inReplyTo, no content
	if (object.type !== 'Note' || !object.name || !object.inReplyTo || object.content) {
		return hookData;
	}

	// Resolve inReplyTo to a local post (e.g. https://example.org/post/123)
	const match = object.inReplyTo.match(/\/post\/(\d+)/);
	if (!match) return hookData;
	const pid = parseInt(match[1], 10);
	if (!(await posts.exists(pid))) return hookData;

	const pollIds = await Poll.getPollIdsByPid(pid);
	if (!pollIds.length) return hookData;

	const pollId = pollIds[0];
	const info = await Poll.getInfo(pollId);
	if (!info) return hookData;

	// Poll must be active
	if (await Poll.hasEnded(pollId) || await Poll.isDeleted(pollId)) {
		return hookData;
	}

	// Match name to a poll option
	const option = info.options.find(opt => opt && opt.title === object.name);
	if (!option) return hookData;

	const remoteActorUrl = activity.actor;
	if (!remoteActorUrl) return hookData;
	const isMulti = parseInt(info.maximumVotesPerUser, 10) > 1;

	// Idempotency: check if the actor has already voted
	if (isMulti) {
		const alreadyVoted = await db.sortedSetScore(`poll:${pollId}:options:${option.id}:votes`, remoteActorUrl);
		if (alreadyVoted) return hookData;
	} else {
		const alreadyVoted = await db.sortedSetScore(`poll:${pollId}:voters`, remoteActorUrl);
		if (alreadyVoted) return hookData;
	}

	// Apply the vote (remote actor URL as the uid — sorted sets handle strings)
	const Vote = require('./vote');
	await Vote.add({
		pollId,
		options: [option.id],
		uid: remoteActorUrl,
		voteAnon: false,
	});

	// Claim the activity so it is not processed as a regular post
	hookData.claimed = true;

	// Publish Update(Question) with refreshed results back to the voter
	const activitypub = nodebb.require('./src/activitypub');
	const [votersCount, refreshedOptions] = await Promise.all([
		Poll.getVotersCount(pollId),
		Poll.getOptions(pollId, false),
	]);
	const questionObject = {
		id: object.inReplyTo,
		type: 'Question',
		attributedTo: await posts.getPostField(pid, 'uid'),
		to: ['https://www.w3.org/ns/activitystreams#Public'],
		content: await posts.getPostField(pid, 'content'),
	};
	const isMultiChoice = parseInt(info.maximumVotesPerUser, 10) > 1;
	const optionsPayload = refreshedOptions
		.filter(opt => opt && typeof opt.title === 'string')
		.map(opt => ({
			type: 'Note',
			name: opt.title,
			replies: { type: 'Collection', totalItems: opt.voteCount || 0 },
		}));
	if (isMultiChoice) {
		questionObject.anyOf = optionsPayload;
	} else {
		questionObject.oneOf = optionsPayload;
	}
	if (votersCount > 0) {
		questionObject.votersCount = votersCount;
	}
	const end = parseInt(info.end, 10);
	if (end > 0) {
		questionObject.endTime = new Date(end).toISOString();
	}
	if (end > 0 && Date.now() > end) {
		questionObject.closed = true;
	}

	// Fire-and-forget: send the Update to the voter
	setImmediate(() => {
		activitypub.send('uid', 0, [remoteActorUrl], {
			id: `${object.id || object.inReplyTo}#update/${Date.now()}`,
			type: 'Update',
			object: questionObject,
		}).catch(() => {});
	});

	return hookData;
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

Hooks.action.postsPurge = async function (data) {
	const { posts } = data;
	const pollIds = await Poll.getPollIdsByPids(posts.map(p => p.pid));
	const toDelete = pollIds.flat();
	if (toDelete.length) {
		await Poll.deletePolls(toDelete);
	}
};

async function canCreate(cid, uid) {
	const can = await privileges.categories.can('poll:create', cid, uid);
	if (!can) {
		throw new Error('[[poll:error.privilege.create]]');
	}
}

