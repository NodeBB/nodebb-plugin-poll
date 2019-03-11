
var async = require.main.require('async');
var NodeBB = require('../lib/nodebb');

module.exports = {
	name: 'Give all registered-users poll:create privileges on all categories',
	timestamp: Date.UTC(2019, 2, 8),
	method: function (callback) {
		NodeBB.db.getSortedSetRange('categories:cid', 0, -1, function(err, cids) {
			async.some(cids, function (cid, next) {
				// if any category already had a poll:create privilege, then this has ran before
				// todo: weak check?
				NodeBB.Privileges.categories.groupPrivileges(cid, 'registered-users', function (err, privileges) {
					if (err) {
						return next(err);
					}
					return next(null, !!privileges['poll:create']);
				});
			}, function (err, result) {
				// if true, then skip
				if (result) {
					return callback();
				}
				async.each(cids, function(cid, next) {
					NodeBB.Privileges.categories.give(['poll:create'], cid, 'registered-users', next);
				}, callback);
			});

		});
	}
};