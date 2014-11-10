var	NodeBB = require('./lib/nodebb'),
	Config = require('./lib/config'),
	Sockets = require('./lib/sockets'),
	Hooks = require('./lib/hooks'),
	Utils = require('./lib/utils'),
	Admin = require('./lib/admin'),

	PluginSockets = NodeBB.pluginSockets,
	AdminSockets = NodeBB.adminSockets,

	app;

var Poll = {};

Poll.init = {
	load: function(data, callback) {
		app = data.app;
		function renderAdmin(req, res, next) {
			//Config.api(function(data) {
				res.render('poll/admin', {});
			//});
		}

		data.router.get('/admin/poll', data.middleware.admin.buildHeader, renderAdmin);
		data.router.get('/api/admin/poll', renderAdmin);
		PluginSockets.poll = Sockets;
		AdminSockets.poll = Config.settingSockets;
		Utils.app = data.router;
		Utils.scheduler.init();
		callback();
	},
	admin: {
		addNavigation: function(custom_header, callback) {
			custom_header.plugins.push({
				route: Config.plugin.route,
				icon: Config.plugin.icon,
				name: Config.plugin.name
			});

			callback(null, custom_header);
		}
	}
};

Poll.hooks = Hooks;

module.exports = Poll;
