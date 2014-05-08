var NodeBB = require('./nodebb'),
	Settings = NodeBB.settings,

	pjson = require('../package.json'),

	Config = {};

Config.plugin = {
	name: 'Poll',
	id: 'poll',
	version: pjson.version,
	description: pjson.description,
	icon: 'fa-bar-chart-o',
	route: '/poll'
};

Config.defaults = {
	toggles: {
		allowAnon: false
	},
	limits: {
		maxOptions: 10
	}
};

Config.settings = new Settings(Config.plugin.id, Config.plugin.version, Config.defaults);

Config.settingSockets = {
	sync: function() {
		Config.settings.sync();
	},
	getDefaults: function(socket, data, callback) {
		callback(null, Config.settings.createDefaultWrapper());
	}
};

module.exports = Config;