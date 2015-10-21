var NodeBB = {};

(function(parent) {
	NodeBB = module.exports = {
		db: parent.require('./database'),
		settings: parent.require('./settings'),
		meta: parent.require('./meta'),
		user: parent.require('./user'),
		topics: parent.require('./topics'),
		pluginSockets: parent.require('./socket.io/plugins'),
		adminSockets: parent.require('./socket.io/admin').plugins,
		socketIndex: parent.require('./socket.io/index'),
		translator: parent.require('../public/src/modules/translator')
	};
}(module.parent.parent));
