'use strict';

const meta = nodebb.require('./src/meta');

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
	const merged = {
		...Config.defaults,
		...settings,
	};
	// NodeBB's settings helper stores checkboxes as 'on'/'off'; normalize to a boolean
	// so parseInt(...) === 1 checks don't silently fail.
	merged.allowGuestsToViewResults = ['1', 1, 'on', true].includes(merged.allowGuestsToViewResults);
	// NodeBB's settings helper stores blank number fields as ''; fall back to defaults
	// so an empty ACP field doesn't override the configured default.
	merged.maxOptions = parseInt(merged.maxOptions, 10) || Config.defaults.maxOptions;
	merged.maximumVotesPerUser = parseInt(merged.maximumVotesPerUser, 10) || Config.defaults.maximumVotesPerUser;
	// NodeBB's settings helper stores blank text fields as ''; fall back to the
	// configured default so an empty ACP field doesn't override the built-in default.
	merged.defaultTitle = merged.defaultTitle || Config.defaults.defaultTitle;
	return merged;
};

