
var async = require.main.require('async');
var NodeBB = require('../lib/nodebb');

module.exports = {
	name: 'Give all registered-users poll:create privileges on all categories',
	timestamp: Date.UTC(2019, 2, 8),
	method: function (callback) {
		NodeBB.db.getSortedSetRange('categories:cid', 0, -1, function(err, cids) {
			async.each(cids, function(cid, next) {
				NodeBB.Privileges.categories.give(['poll:create'], cid, 'registered-users', next);
			}, callback);
		});
	}
};