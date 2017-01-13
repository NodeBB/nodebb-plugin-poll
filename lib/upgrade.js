"use strict";

var pjson = require('../package.json'),
	NodeBB = require('./nodebb'),
	async = require('async'),
	winston = require.main.require('winston');

(function(Upgrade) {

	Upgrade.doUpgrade = function(oldVersion, newVersion, callback) {
		var thisVersion;

		async.series([
			function(next) {
				thisVersion = '0.2.2';

				if (oldVersion < thisVersion) {
					NodeBB.db.getSortedSetRange('categories:cid', 0, -1, function(err, cids) {
						async.each(cids, function(cid, next) {
							winston.verbose('[plugin/poll] Upgrading cid ' + cid);
							NodeBB.Privileges.categories.give(['poll:create'], cid, 'registered-users', next);
						}, next);
					});
				} else {
					next();
				}
			}
		], function(err) {
			if (err) {
				error(err);
			} else {
				done();
			}
		});

		function done() {
			NodeBB.winston.info('[' + pjson.name + '] Upgraded from ' + oldVersion + ' to ' + newVersion);
			callback();
		}

		function error(err) {
			NodeBB.winston.error(err);
			NodeBB.winston.info('[' + pjson.name + '] No upgrade performed, old version was ' + oldVersion + ' and new version is ' + newVersion);
			callback();
		}
	};

})(module.exports);
