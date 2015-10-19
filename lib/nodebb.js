var NodeBB = {};

(function(parent) {
	NodeBB = {
		db: parent.require('./database'),
		settings: parent.require('./settings'),
		meta: parent.require('./meta'),
		user: parent.require('./user'),
		topics: parent.require('./topics'),
		pluginSockets: parent.require('./socket.io/plugins'),
		adminSockets: parent.require('./socket.io/admin').plugins,
		socketIndex: parent.require('./socket.io/index'),
		initTranslator: function(){
			try {
				NodeBB['translator'] = module.parent.parent.require('../public/src/translator');
			}catch(e){
				// 0.7.x
				NodeBB['translator'] = module.parent.parent.require('../public/src/modules/translator');
			}
		}
	};
}(module.parent.parent));

module.exports = NodeBB;
