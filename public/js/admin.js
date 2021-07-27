'use strict';

define('admin/plugins/poll', ['settings'], function (Settings) {
	var wrapper;

	var ACP = {};

	ACP.init = function () {
		wrapper = $('.poll-settings');

		Settings.sync('poll', wrapper);

		$('#save').on('click', function () {
			save();
		});

		$('#reset').click(function () {
			reset();
		});
	};

	function save() {
		Settings.persist('poll', wrapper, function () {
			socket.emit('admin.plugins.poll.sync');
		});
	}

	function reset() {
		bootbox.confirm('Are you sure you wish to reset the settings?', function (sure) {
			if (sure) {
				socket.emit('admin.plugins.poll.getDefaults', null, function (err, data) {
					if (err) {
						console.error(err);
					}
					Settings.set('poll', data, wrapper, function () {
						socket.emit('admin.plugins.poll.sync');
					});
				});
			}
		});
	}

	return ACP;
});
