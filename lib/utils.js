var NodeBB = require('./nodebb'),
	db = NodeBB.db;

var Utils = {
	isFirstPost: function(pid, tid, callback) {
		//Check if topic is empty
		db.getSortedSetRange('tid:' + tid + ':posts', 0, 0, function(err, pids) {
			if(err) {
				return callback(err);
			}

			callback(null, pids.length === 0);
		});
	}
};

module.exports = Utils;