var NodeBB = {};

(function(parent) {
	NodeBB = {
		db: parent.require('./database'),
		meta: parent.require('./meta'),
		topics: parent.require('./topics'),
		postTools: parent.require('./postTools'),
		pluginSockets: parent.require('./socket.io/plugins'),
		socketIndex: parent.require('./socket.io/index')
	};
}(module.parent.parent));

module.exports = NodeBB;