module.exports = {
	db: require.main.require('./src/database'),
	Settings: require.main.require('./src/settings'),
	Meta: require.main.require('./src/meta'),
	User: require.main.require('./src/user'),
	Posts: require.main.require('./src/posts'),
	Topics: require.main.require('./src/topics'),
	Privileges: require.main.require('./src/privileges'),
	PluginSockets: require.main.require('./src/socket.io/plugins'),
	AdminSockets: require.main.require('./src/socket.io/admin').plugins,
	SocketIndex: require.main.require('./src/socket.io/index'),
	Translator: require.main.require('./public/src/modules/translator'),
	winston: require.main.require('winston'),
	app: null
};
