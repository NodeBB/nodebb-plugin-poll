'use strict';

const nconf = require.main.require('nconf');

const NodeBB = require('./lib/nodebb');
const Config = require('./lib/config');
const Sockets = require('./lib/sockets');
const Hooks = require('./lib/hooks');
const Scheduler = require('./lib/scheduler');

const Plugin = module.exports;

Plugin.hooks = Hooks;

Plugin.load = async function (params) {
	const routeHelpers = require.main.require('./src/routes/helpers');
	const { router } = params;

	routeHelpers.setupAdminPageRoute(router, `/admin/plugins/${Config.plugin.id}`, (req, res) => {
		res.render(`admin/plugins/${Config.plugin.id}`, {
			title: 'Poll',
		});
	});

	NodeBB.PluginSockets[Config.plugin.id] = Sockets;
	NodeBB.AdminSockets[Config.plugin.id] = Config.adminSockets;

	NodeBB.app = params.app;

	if (nconf.get('runJobs')) {
		Scheduler.start();
	}

	await Config.init();
};

Plugin.addAdminNavigation = function (adminHeader) {
	adminHeader.plugins.push({
		route: `/plugins/${Config.plugin.id}`,
		icon: Config.plugin.icon,
		name: Config.plugin.name,
	});
	return adminHeader;
};

Plugin.registerFormatting = function (payload) {
	payload.options.push({
		name: 'poll',
		className: `fa ${Config.plugin.icon}`,
		title: '[[poll:creator_title]]',
	});
	return payload;
};

Plugin.addPrivilege = function (hookData) {
	hookData.privileges.set(
		'poll:create', { label: '[[poll:admin.create-poll]]' },
	);
};

Plugin.copyPrivilegesFrom = function (data) {
	if (data.privileges.indexOf('poll:create') === -1) {
		data.privileges.push('poll:create');
	}

	if (data.privileges.indexOf('groups:poll:create') === -1) {
		data.privileges.push('groups:poll:create');
	}
	return data;
};
