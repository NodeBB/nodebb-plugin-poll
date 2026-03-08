'use strict';

const NodeBB = require('./lib/nodebb');
const Config = require('./lib/config');
const Sockets = require('./lib/sockets');
const Hooks = require('./lib/hooks');
const Poll = require('./lib/poll');
const db = require.main.require('./src/database');
const pagination = require.main.require('./src/pagination');
const utils = require.main.require('./src/utils');

const Plugin = module.exports;

Plugin.hooks = Hooks;

Plugin.load = async function (params) {
	const routeHelpers = require.main.require('./src/routes/helpers');
	const { router } = params;

	routeHelpers.setupAdminPageRoute(router, `/admin/plugins/${Config.plugin.id}`, async (req, res) => {
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const itemsPerPage = 20;
		const start = Math.max(0, (page - 1) * itemsPerPage);
		const stop = start + itemsPerPage - 1;
		const [pollIds, count] = await Promise.all([
			db.getSortedSetRevRange('polls:createtime', start, stop),
			db.sortedSetCard('polls:createtime'),
		]);

		const pollData = await db.getObjects(pollIds.map(pollId => `poll:${pollId}`));
		const voteCounts = await Promise.all(pollIds.map(Poll.getVoteCount));
		pollData.forEach((poll, index) => {
			if (poll) {
				poll.timestampISO = utils.toISOString(poll.timestamp);
				poll.endISO = utils.toISOString(poll.end);
				poll.voteCount = voteCounts[index];
			}
		});
		const pageCount = Math.ceil(count / itemsPerPage);
		res.render(`admin/plugins/${Config.plugin.id}`, {
			title: 'Poll',
			polls: pollData,
			pagination: pagination.create(page, pageCount, req.query),
		});
	});

	NodeBB.PluginSockets[Config.plugin.id] = Sockets;

	NodeBB.app = params.app;
};

Plugin.addAdminNavigation = function (adminHeader) {
	adminHeader.plugins.push({
		route: `/plugins/${Config.plugin.id}`,
		icon: Config.plugin.icon,
		name: Config.plugin.name,
	});
	return adminHeader;
};

Plugin.addPrivilege = function (hookData) {
	hookData.privileges.set(
		'poll:create', { label: '[[poll:admin.create-poll]]' },
	);
};

Plugin.copyPrivilegesFrom = function (data) {
	if (data.privileges.indexOf('poll:create') === -1) {
		data.privileges.push('poll:create');
	}

	if (data.privileges.indexOf('groups:poll:create') === -1) {
		data.privileges.push('groups:poll:create');
	}
	return data;
};

Plugin.defineWidgets = async function (widgets) {
	const widget = {
		widget: 'poll',
		name: 'Poll',
		description: 'Display a poll',
		content: await NodeBB.app.renderAsync('admin/partials/widgets/poll', {}),
	};

	widgets.push(widget);
	return widgets;
};

Plugin.renderPollWidget = async function (widget) {
	const { pollId } = widget.data;
	const Poll = require('./lib/poll');
	const pollData = await Poll.get(pollId, widget.uid, widget.req.loggedIn);
	if (!pollData) {
		return null;
	}
	widget.html = await NodeBB.app.renderAsync('poll/widget.tpl', { pollId });
	return widget;
};
