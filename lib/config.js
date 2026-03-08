'use strict';

const meta = require.main.require('./src/meta');

const packageInfo = require('../package.json');
const pluginInfo = require('../plugin.json');

const pluginId = pluginInfo.id.replace('nodebb-plugin-', '');

const Config = exports;

Config.plugin = {
	name: pluginInfo.name,
	id: pluginId,
	version: packageInfo.version,
	description: packageInfo.description,
	icon: 'fa-bar-chart-o',
};

Config.defaults = {
	defaultTitle: 'Poll',
	maxOptions: 10,
	maximumVotesPerUser: 1,
	allowGuestsToViewResults: 0,
	disallowVoteUpdate: 0,
	allowAnonVoting: 0,
};

Config.getSettings = async function () {
	const settings = await meta.settings.get(Config.plugin.id);
	return {
		...Config.defaults,
		...settings,
	};
};

