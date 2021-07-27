'use strict';

(function (Poll) {
	var messages = [
		{
			method: 'getPoll',
			message: 'plugins.poll.get',
		},
		{
			method: 'vote',
			message: 'plugins.poll.vote',
		},
		{
			method: 'updateVote',
			message: 'plugins.poll.updateVote',
		},
		{
			method: 'removeVote',
			message: 'plugins.poll.removeVote',
		},
		{
			method: 'getOptionDetails',
			message: 'plugins.poll.getOptionDetails',
		},
		{
			method: 'getConfig',
			message: 'plugins.poll.getConfig',
		},
		{
			method: 'canCreate',
			message: 'plugins.poll.canCreate',
		},
	];

	var handlers = [
		{
			event: 'event:poll.voteChange',
			handle: function (data) {
				Poll.view.update(data);
			},
		},
	];

	function init() {
		handlers.forEach(function (handler) {
			if (socket.listeners(handler.event).length === 0) {
				socket.on(handler.event, handler.handle);
			}
		});

		messages.forEach(function (message) {
			Poll.sockets[message.method] = function (data, callback) {
				socket.emit(message.message, data, callback);
			};
		});
	}

	Poll.sockets = {};

	init();
}(window.Poll));
