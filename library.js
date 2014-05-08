var	NodeBB = require('./lib/nodebb'),
	Config = require('./lib/config'),
	Sockets = require('./lib/sockets'),
	Hooks = require('./lib/hooks'),
	Admin = require('./lib/admin'),

	PluginSockets = NodeBB.pluginSockets,
	AdminSockets = NodeBB.adminSockets,

	app;

var Poll = {};

Poll.init = {
	load: function(expressApp, middleware, controllers) {
		app = expressApp;
		function renderAdmin(req, res, next) {
			//Config.api(function(data) {
				res.render('poll/admin', {});
			//});
		}

		app.get('/admin/poll', middleware.admin.buildHeader, renderAdmin);
		app.get('/api/admin/poll', renderAdmin);
		PluginSockets.poll = Sockets;
		AdminSockets.poll = Config.settingSockets;
		Hooks.tools.app = app;
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
