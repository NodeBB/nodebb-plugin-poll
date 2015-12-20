"use strict";

var NodeBB = require('./nodebb');

(function(Utils) {

	Utils.app = null;

	Utils.isFirstPost = function(pid, tid, callback) {
		// Check if topic is empty or if post is first post
		NodeBB.db.getSortedSetRange('tid:' + tid + ':posts', 0, 0, function(err, pids) {
			if(err) {
				return callback(err);
			}

			callback(null, pids.length === 0 || parseInt(pids[0], 10) === parseInt(pid, 10));
		});
	};

})(exports);