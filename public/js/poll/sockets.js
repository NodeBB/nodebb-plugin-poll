(function(Poll) {
	var Sockets = {
		events: {
			load: 'plugins.poll.load',
			vote: 'plugins.poll.vote',
			details: 'plugins.poll.optionDetails',
			onvotechange: 'event:poll.votechange'
		},
		on: {
			votechange: {
				register: function() {
					if (socket.listeners(Sockets.events.onvotechange).length === 0) {
						socket.on(Sockets.events.onvotechange, this.handle);
					}
				},
				handle: function(data) {
					Poll.view.updateResults(data, $('#poll-id-' + data.pollid));
				}
			}
		},
		emit: {
			load: function(pollid, callback) {
				socket.emit(Sockets.events.load, { pollid: pollid }, callback);
			},
			vote: function(voteData, callback) {
				socket.emit(Sockets.events.vote, voteData, callback);
			},
			getDetails: function(data, callback) {
				socket.emit(Sockets.events.details, data, callback);
			}
		}
	};

	function initialise() {
		for (var e in Sockets.on) {
			if (Sockets.on.hasOwnProperty(e)) {
				Sockets.on[e].register();
			}
		}
	}

	initialise();

	Poll.sockets = {
		emit: Sockets.emit
	};
})(window.Poll);
