'use strict';

/* global Poll */

window.Poll = {};

$(document).ready(function () {
	window.Poll.alertError = function (message) {
		require(['alerts'], function (alerts) {
			alerts.error(message);
		});
	};

	require(['hooks'], function (hooks) {
		// add polls to data that is sent to server on composer submit
		hooks.on('filter:composer.submit', function (hookData) {
			hookData.composerData.polls = hookData.postData.polls || [];
		});
	});

	$(window).on('action:topic.loading', function () {
		if (ajaxify.data.posts.length > 0) {
			ajaxify.data.posts.forEach((post) => {
				getPollByPost(post);
			});
		}
	});

	$(window).on('action:posts.loaded', function (ev, data) {
		data.posts.forEach((post) => {
			getPollByPost(post);
		});
	});

	$(window).on('action:posts.edited', function (ev, data) {
		if (data.post.hasOwnProperty('pollId')) {
			getPollByPost(data.post);
		}
	});

	$(window).on('action:ajaxify.end', function () {
		$('[data-widget-poll-id]').each(function () {
			getPolls([$(this).attr('data-widget-poll-id')], $(this));
		});
	});

	socket.on('event:poll.voteChange', function (data) {
		Poll.view.update(data.pollData, data.uid);
	});

	function getPollByPost(post) {
		if (!post || !post.hasOwnProperty('pollIds') || !post.pollIds) return;
		let pollIds;
		try {
			pollIds = JSON.parse(post.pollIds || '[]');
		} catch (err) {
			pollIds = [];
		}
		if (pollIds.length) {
			const postEl = $(`[component="post"][data-pid="${post.pid}"]`);
			getPolls(pollIds, postEl.find('[component="post/content"]'));
		}
	}

	function getPolls(pollIds, container) {
		const validPollIds = pollIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
		if (!socket.connected) {
			socket.connect();
		}

		socket.emit('plugins.poll.get', { pollIds: validPollIds.reverse() }, function (err, pollDataArr) {
			if (err) {
				return Poll.alertError(err.message);
			}

			pollDataArr.forEach((pollData) => {
				pollData.container = container;
				Poll.view.load(pollData);
			});
		});
	}
});
