'use strict';

const NodeBB = require('./lib/nodebb');
const Config = require('./lib/config');
const Sockets = require('./lib/sockets');
const Hooks = require('./lib/hooks');
const Scheduler = require('./lib/scheduler');

(function (Plugin) {
	Plugin.hooks = Hooks;

	Plugin.load = async function (params) {
		function renderAdmin(req, res) {
			res.render(`admin/plugins/${Config.plugin.id}`, {});
		}

		params.router.get(`/admin/plugins/${Config.plugin.id}`, params.middleware.admin.buildHeader, renderAdmin);
		params.router.get(`/api/admin/plugins/${Config.plugin.id}`, renderAdmin);

		NodeBB.PluginSockets[Config.plugin.id] = Sockets;
		NodeBB.AdminSockets[Config.plugin.id] = Config.adminSockets;

		NodeBB.app = params.app;

		Scheduler.start();
		await Config.init();
	};

	Plugin.addAdminNavigation = async function (adminHeader) {
		adminHeader.plugins.push({
			route: `/plugins/${Config.plugin.id}`,
			icon: Config.plugin.icon,
			name: Config.plugin.name,
		});
		return adminHeader;
	};

	Plugin.registerFormatting = async function (payload) {
		payload.options.push({
			name: 'poll',
			className: `fa ${Config.plugin.icon}`,
			title: '[[poll:creator_title]]',
		});
		return payload;
	};

	Plugin.addUserPrivilege = async function (privileges) {
		privileges.push('poll:create');
		return privileges;
	};

	Plugin.addPrivilegeLabels = async function (labels) {
		labels.push({ name: 'Create Poll' });
		return labels;
	};

	Plugin.addGroupPrivilege = async function (privileges) {
		privileges.push('groups:poll:create');
		return privileges;
	};

	Plugin.copyPrivilegesFrom = async function (data) {
		if (data.privileges.indexOf('poll:create') === -1) {
			data.privileges.push('poll:create');
		}
		if (data.privileges.indexOf('groups:poll:create') === -1) {
			data.privileges.push('groups:poll:create');
		}
		return data;
	};
}(exports));
