var NodeBB = {};

(function(parent) {
	NodeBB = module.exports = {
		db: parent.require('./database'),
		Settings: parent.require('./settings'),
		Meta: parent.require('./meta'),
		User: parent.require('./user'),
		Posts: parent.require('./posts'),
		Topics: parent.require('./topics'),
		PluginSockets: parent.require('./socket.io/plugins'),
		AdminSockets: parent.require('./socket.io/admin').plugins,
		SocketIndex: parent.require('./socket.io/index'),
		Translator: parent.require('../public/src/modules/translator'),

		winston: parent.require('winston'),

		app: null
	};
}(module.parent.parent));
