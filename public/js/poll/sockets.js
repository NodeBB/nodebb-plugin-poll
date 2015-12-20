"use strict";
/* globals socket */

(function(Poll) {
	var messages = {
		load: 'plugins.poll.load',
		vote: 'plugins.poll.vote',
		getDetails: 'plugins.poll.getOptionDetails',
		getConfig: 'plugins.poll.getConfig'
	};

	var handlers = [{
		event: 'event:poll.votechange',
		handle: function(data) {
			Poll.view.updateResults(data, $('#poll-id-' + data.pollid));
		}
	}];

	function init() {
		handlers.forEach(function(handler) {
			if (socket.listeners(handler.event).length === 0) {
				socket.on(handler.event, handler.handle);
			}
		});

		for (var m in messages) {
			if (messages.hasOwnProperty(m)) {
				Poll.sockets[m] = function(data, callback) {
					socket.emit(messages[m], data, callback);
				};
			}
		}
	}

	Poll.sockets = {};

	init();

})(window.Poll);
