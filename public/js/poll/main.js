"use strict";

var Poll = {};

(function() {

	$(window).on('action:topic.loading', function() {
		if (ajaxify.data.posts.length > 0 && ajaxify.data.posts[0].hasOwnProperty('pollId')) {
			var pollId = ajaxify.data.posts[0].pollId;

			Poll.sockets.getPoll({pollId: pollId}, function(err, pollData) {
				if (err && app.user.uid) {
					return app.alertError(err.message);
				}

				Poll.view.load(pollData);
			});
		}
	});

})();