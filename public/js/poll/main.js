'use strict';

/* global Poll */

window.Poll = {};

(function () {
	window.Poll.alertError = function (message) {
		require(['alerts'], function (alerts) {
			alerts.error(message);
		});
	};

	// eslint-disable-next-line import/no-unresolved
	require('poll/serializer')(window.utils);

	$(window).on('action:topic.loading', function () {
		if (ajaxify.data.posts.length > 0 && ajaxify.data.posts[0].hasOwnProperty('pollId')) {
			getPollByPost(ajaxify.data.posts[0]);
		}
	});

	$(window).on('action:posts.loaded', function (ev, data) {
		data.posts.forEach((post) => {
			if (post.hasOwnProperty('pollId')) {
				getPollByPost(post);
			}
		});
	});

	$(window).on('action:posts.edited', function (ev, data) {
		if (data.post.hasOwnProperty('pollId')) {
			getPollByPost(data.post);
		}
	});

	$(window).on('action:ajaxify.end', function () {
		$('[data-widget-poll-id]').each(function () {
			getPoll($(this).attr('data-widget-poll-id'), $(this));
		});
	});

	socket.on('event:poll.voteChange', function (data) {
		Poll.view.update(data.pollData, data.uid);
	});

	function getPollByPost(post) {
		const postEl = $('[component="post"][data-pid="' + post.pid + '"]');
		if (postEl.length && post.pollId) {
			getPoll(post.pollId, postEl.find('[component="post/content"]'));
		}
	}

	function getPoll(pollId, container) {
		pollId = parseInt(pollId, 10);
		if (!isNaN(pollId)) {
			socket.emit('plugins.poll.get', { pollId }, function (err, pollData) {
				if (err) {
					return Poll.alertError(err.message);
				}
				pollData.container = container;
				Poll.view.load(pollData);
			});
		}
	}
}());
