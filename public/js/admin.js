'use strict';

define('admin/plugins/poll', ['settings', 'api', 'alerts', 'modals'], function (Settings, api, alerts, modals) {
	const ACP = {};

	ACP.init = function () {
		Settings.load('poll', $('.poll-settings'));

		$('#save').on('click', function () {
			Settings.save('poll', $('.poll-settings'));
		});

		$('#poll-table').on('click', '[data-action="delete-poll"]', function () {
			const pollId = $(this).data('poll-id');
			modals.confirm('[[poll:confirm-delete-poll]]', async (ok) => {
				if (!ok) {
					return;
				}
				try {
					await api.del(`/admin/plugins/poll/poll/${pollId}`);
					alerts.success('[[poll:poll-deleted]]');
					ajaxify.go(ajaxify.data.url);
				} catch (e) {
					alerts.error(e);
				}
			});
		});
	};

	return ACP;
});
