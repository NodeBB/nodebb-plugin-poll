'use strict';

const NodeBB = require('./nodebb');

const packageInfo = require('../package.json');
const pluginInfo = require('../plugin.json');

const pluginId = pluginInfo.id.replace('nodebb-plugin-', '');

(function (Config) {
	Config.plugin = {
		name: pluginInfo.name,
		id: pluginId,
		version: packageInfo.version,
		description: packageInfo.description,
		icon: 'fa-bar-chart-o',
	};

	Config.defaults = {
		toggles: {
			allowAnon: false,
		},
		limits: {
			maxOptions: 10,
		},
		defaults: {
			title: 'Poll',
			maxvotes: 1,
			disallowVoteUpdate: 0,
			end: 0,
		},
	};

	Config.settings = {};

	Config.init = function (callback) {
		Config.settings = new NodeBB.Settings(Config.plugin.id, Config.plugin.version, Config.defaults, callback);
	};

	Config.adminSockets = {
		sync: function () {
			Config.settings.sync();
		},
		getDefaults: function (socket, data, callback) {
			callback(null, Config.settings.createDefaultWrapper());
		},
	};
}(exports));
