'use strict';

define('admin/plugins/poll', ['settings'], function (Settings) {
	const ACP = {};

	ACP.init = function () {
		Settings.load('poll', $('.poll-settings'));

		$('#save').on('click', function () {
			Settings.save('poll', $('.poll-settings'));
		});
	};

	return ACP;
});
