'use strict';

module.exports = {
	db: nodebb.require('./src/database'),
	Settings: nodebb.require('./src/settings'),
	Meta: nodebb.require('./src/meta'),
	User: nodebb.require('./src/user'),
	Posts: nodebb.require('./src/posts'),
	Topics: nodebb.require('./src/topics'),
	Privileges: nodebb.require('./src/privileges'),
	Plugins: nodebb.require('./src/plugins'),
	PluginSockets: nodebb.require('./src/socket.io/plugins'),
	SocketIndex: nodebb.require('./src/socket.io/index'),
	Translator: nodebb.require('./src/translator'),
	winston: nodebb.require('winston'),
	app: null,
};
