var NodeBB = module.require('./nodebb'),

	Meta = NodeBB.meta;

var Config = {
	plugin: {
		name: 'Poll',
		id: 'poll',
		description: 'Poll plugin',
		icon: 'fa-bar-chart-o',
		route: '/poll'
	},
	prefix: 'poll:',
	keys: [],
	defaults: {},
	get: function(key) {
		if (Config.keys.indexOf(key) !== -1) {
			return Meta.config[Config.prefix + key] || Config.defaults[key];
		}
	}
}

module.exports = Config;