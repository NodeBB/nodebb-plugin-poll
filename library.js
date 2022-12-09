'use strict';

const NodeBB = require('./lib/nodebb');
const Config = require('./lib/config');
const Sockets = require('./lib/sockets');
const Hooks = require('./lib/hooks');
const Scheduler = require('./lib/scheduler');

(function (Plugin) {
	Plugin.hooks = Hooks;

	Plugin.load = function (params, callback) {
		function renderAdmin(req, res) {
			res.render(`admin/plugins/${Config.plugin.id}`, {});
		}

		params.router.get(`/admin/plugins/${Config.plugin.id}`, params.middleware.admin.buildHeader, renderAdmin);
		params.router.get(`/api/admin/plugins/${Config.plugin.id}`, renderAdmin);

		NodeBB.PluginSockets[Config.plugin.id] = Sockets;
		NodeBB.AdminSockets[Config.plugin.id] = Config.adminSockets;

		NodeBB.app = params.app;
		Scheduler.start();

		Config.init(callback);
	};

	Plugin.addAdminNavigation = function (adminHeader, callback) {
		adminHeader.plugins.push({
			route: `/plugins/${Config.plugin.id}`,
			icon: Config.plugin.icon,
			name: Config.plugin.name,
		});

		callback(null, adminHeader);
	};

	Plugin.registerFormatting = function (payload, callback) {
		payload.options.push({
			name: 'poll',
			className: `fa ${Config.plugin.icon}`,
			title: '[[poll:creator_title]]',
		});

		callback(null, payload);
	};

	Plugin.addPrivilege = function (hookData) {
		hookData.privileges.set(
			'poll:create', { label: '[[poll:admin.create-poll]]' },
		);
	};

	Plugin.copyPrivilegesFrom = function (data, callback) {
		if (data.privileges.indexOf('poll:create') === -1) {
			data.privileges.push('poll:create');
		}

		if (data.privileges.indexOf('groups:poll:create') === -1) {
			data.privileges.push('groups:poll:create');
		}
		callback(null, data);
	};
}(exports));
