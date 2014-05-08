var NodeBB = {};

(function(parent) {
	NodeBB = {
		db: parent.require('./database'),
		settings: parent.require('./settings'),
		meta: parent.require('./meta'),
		topics: parent.require('./topics'),
		postTools: parent.require('./postTools'),
		pluginSockets: parent.require('./socket.io/plugins'),
		adminSockets: parent.require('./socket.io/admin').plugins,
		socketIndex: parent.require('./socket.io/index')
	};
}(module.parent.parent));

module.exports = NodeBB;