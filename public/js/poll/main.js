(function() {
	window.Poll = {
		load: function(data) {
			Poll.sockets.emit.load(data.pollid, function(err, poll) {
				if (!err) {
					Poll.view.init(poll);
				} else if (err.message != 'Not logged in') {
					app.alertError('Something went wrong while getting the poll!');
				}
			});
		}
	};
})();
