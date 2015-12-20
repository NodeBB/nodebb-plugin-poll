"use strict";

var NodeBB = require('./nodebb'),

	packageInfo = require('../package.json'),
	pluginInfo = require('../plugin.json'),
	pluginId = pluginInfo.id.replace('nodebb-plugin-', ''),

	Config = {};

Config.plugin = {
	name: pluginInfo.name,
	id: pluginId,
	version: packageInfo.version,
	description: packageInfo.description,
	icon: 'fa-bar-chart-o'
};

Config.defaults = {
	toggles: {
		allowAnon: false
	},
	limits: {
		maxOptions: 10
	},
	defaults: {
		title: 'Poll',
		maxvotes: 1,
		end: 0
	},
	version: ''
};

Config.settings = {};

Config.init = function(callback) {
	Config.settings = new NodeBB.Settings(Config.plugin.id, Config.plugin.version, Config.defaults, function() {
		var oldVersion = Config.settings.get('version');

		if (oldVersion < Config.settings.version) {
			Config.settings.set('version', Config.plugin.version);
			Config.settings.persist();
			callback();
		} else {
			callback();
		}
	});
};

Config.adminSockets = {
	sync: function() {
		Config.settings.sync();
	},
	getDefaults: function(socket, data, callback) {
		callback(null, Config.settings.createDefaultWrapper());
	}
};

module.exports = Config;