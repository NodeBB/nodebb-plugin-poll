"use strict";

var	NodeBB = require('./lib/nodebb'),
	Config = require('./lib/config'),
	Sockets = require('./lib/sockets'),
	Hooks = require('./lib/hooks'),
	Scheduler = require('./lib/scheduler');

(function(Plugin) {

	Plugin.hooks = Hooks;

	Plugin.load = function(params, callback) {
		function renderAdmin(req, res, next) {
			res.render('admin/plugins/' + Config.plugin.id, {});
		}

		params.router.get('/admin/plugins/' + Config.plugin.id, params.middleware.admin.buildHeader, renderAdmin);
		params.router.get('/api/admin/plugins/' + Config.plugin.id, renderAdmin);

		NodeBB.PluginSockets[Config.plugin.id] = Sockets;
		NodeBB.AdminSockets[Config.plugin.id] = Config.adminSockets;

		NodeBB.app = params.app;
		Scheduler.start();

		Config.init(callback);
	};

	Plugin.addAdminNavigation = function(adminHeader, callback) {
		adminHeader.plugins.push({
			route: '/plugins/' + Config.plugin.id,
			icon: Config.plugin.icon,
			name: Config.plugin.name
		});

		callback(null, adminHeader);
	};

	Plugin.registerFormatting = function(payload, callback) {
		payload.options.push({
			name: 'poll',
			className: 'fa ' + Config.plugin.icon,
			title: '[[poll:creator_title]]'
		});

		callback(null, payload);
	};

	Plugin.addUserPrivilege = function(privileges, callback) {
		privileges.push('poll:create');
		callback(null, privileges);
	};

	Plugin.addUserPrivilegeLabel = function(labels, callback) {
		labels.push({name: 'Create Poll'});
		callback(null, labels);
	};

	Plugin.addGroupPrivilege = function(privileges, callback) {
		privileges.push('groups:poll:create');
		callback(null, privileges);
	};

})(exports);