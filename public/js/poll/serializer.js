"use strict";
/* globals require */

(function(module) {

	var XRegExp, S;
	var Serializer = {};

	if ('undefined' === typeof window) {
		XRegExp = require('xregexp');
		S = require('string');
	} else {
		XRegExp = window.XRegExp;
		require(['string'], function(string){ S = string });
	}

	var pollRegex = XRegExp('(?:(?:\\[poll(?<settings>.*?)\\])\n(?<content>(?:-.+?\n)+)(?:\\[\/poll\\]))', 'g');
	var settingsRegex = XRegExp('(?<key>.+?)=(?:"|&quot;)(?<value>.+?)(?:"|&quot;)', 'g');
	var settingsValidators = {
		title: {
			test: function (value) {
				return value.length > 0;
			},
			parse: function(value) {
				return S(value).stripTags().trim().s;
			}
		},
		maxvotes: {
			test: function (value) {
				return !isNaN(value);
			},
			parse: function(value) {
				return parseInt(value, 10);
			}
		},
		end: {
			test: function (value) {
				return (!isNaN(value) && parseInt(value, 10) > Date.now());
			},
			parse: function(value) {
				return parseInt(value, 10);
			}
		}
	};

	Serializer.canSerialize = function(post) {
		return XRegExp.exec(post, pollRegex) !== null;
	};

	Serializer.removeMarkup = function(content, replace) {
		return XRegExp.replace(content, pollRegex, replace || '');
	};

	Serializer.hasMarkup = function(content) {
		return XRegExp.exec(content, pollRegex) !== null;
	};

	Serializer.serialize = function(post, config) {
		var match = XRegExp.exec(post, pollRegex);

		if (match === null) {
			return null;
		}

		return {
			options: serializeOptions(match.content, config),
			settings: serializeSettings(match.settings, config)
		};
	};

	Serializer.deserialize = function(poll, config) {
		var options = deserializeOptions(poll.options, config);
		var settings = deserializeSettings(poll.settings, config);

		return '[poll' + settings +']\n' + options + '\n[/poll]';
	};

	function serializeOptions(raw, config) {
		var pollOptions = [];
		var rawOptions = S(raw).stripTags().s.split('\n');
		var maxOptions = parseInt(config.limits.maxOptions, 10);

		rawOptions.forEach(function(option) {
			if (option.length) {
				option = S(option.split('-')[1]).trim().s;

				if (option.length) {
					pollOptions.push(option);
				}
			}
		});

		if (pollOptions.length > maxOptions) {
			pollOptions = pollOptions.slice(0, maxOptions - 1);
		}

		return pollOptions;
	}

	function deserializeOptions(options, config) {
		var maxOptions = config.limits.maxOptions;

		options = options.map(function (option) {
			return S(option).stripTags().trim().s;
		}).filter(function (option) {
			return option.length;
		});

		if (options.length > maxOptions) {
			options = options.slice(0, maxOptions - 1);
		}

		return options.length ? '- ' + options.join('\n- ') : '';
	}

	function serializeSettings(raw, config) {
		var settings = {};

		Object.keys(config.defaults).forEach(function(key) {
			settings[key] = config.defaults[key];
		});

		XRegExp.forEach(S(raw).stripTags().s, settingsRegex, function(match) {
			var key = S(match.key).trim().s;
			var value = S(match.value).trim().s;

			if (key.length && value.length && settingsValidators.hasOwnProperty(key)) {
				if (settingsValidators[key].test(value)) {
					settings[key] = settingsValidators[key].parse(value);
				}
			}
		});

		return settings;
	}

	function deserializeSettings(settings, config) {
		var deserialized = '';

		for (var k in settings) {
			if (settings.hasOwnProperty(k) && config.defaults.hasOwnProperty(k)) {
				var key = S(k).stripTags().trim().s;
				var value = S(settings[k]).stripTags().trim().s;

				if (key.length && value.length && settingsValidators.hasOwnProperty(key)) {
					if (settingsValidators[key].test(value)) {
						deserialized += ' ' + key + '="' + value + '"';
					}
				}
			}
		}

		return deserialized;
	}

	module.exports = Serializer;

	if ('undefined' !== typeof window) {
		Poll.serializer = module.exports;
	}

})('undefined' === typeof module ? {
	module: {
		exports: {}
	}
} : module);