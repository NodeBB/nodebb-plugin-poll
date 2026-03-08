'use strict';

(function (Poll) {
	const Creator = {};

	function init() {
		$(window).on('action:composer.enhanced', initComposer);
	}

	function initComposer(ev, { postContainer, postData }) {
		require(['composer', 'composer/formatting'], function (composer, formatting) {
			if (formatting) {
				formatting.addButtonDispatch('poll', function (/* textarea */) {
					onPollButtonClicked(composer);
				});

				updateComposerBadgeCount(postContainer, postData.polls ? postData.polls.length : 0);
			}
		});
	}

	async function onPollButtonClicked(composer) {
		const postData = composer.posts[composer.active];
		if (!postData) {
			return showAlert('error', '[[poll:error.invalid-post]]');
		}
		if (parseInt(postData.cid, 10) === 0) {
			return showAlert('error', '[[error:category-not-selected]]');
		}

		const canCreate = await socket.emit('plugins.poll.canCreate', {
			cid: postData.cid,
			pid: postData.pid,
			tid: postData.tid,
		});
		if (!canCreate) {
			return showAlert('error', '[[error:no-privileges]]');
		}
		postData.polls = postData.polls || [];
		await openManageModal({ postData, uuid: composer.active });
	}

	async function openManageModal(payload) {
		const bootbox = await app.require('bootbox');
		const { postData, modal, uuid } = payload;
		const html = await app.parseAndTranslate('poll/manage', { post: postData });

		if (modal) {
			modal.find('.bootbox-body').html(html[0].outerHTML);
			handleSort({ modal, polls: postData.polls });
		} else {
			const modal = bootbox.dialog({
				title: '[[poll:manage-polls]]',
				message: html,
				className: 'poll-manage',
				buttons: {
					add: {
						label: '<i class="fa fa-plus"></i> [[poll:add-poll]]',
						className: 'btn-success',
						callback: () => {
							Creator.show({
								// temp id, will be replaced in the backend before saving
								// used to identify the poll in the manage modal after creation
								// so we can edit/delete
								pollId: Date.now(),
								maximumVotesPerUser: config.poll.maximumVotesPerUser,
							}, config.poll).then((newPoll) => {
								if (newPoll) {
									postData.polls.push(newPoll);
								}
								openManageModal({ ...payload, modal });
								const postContainer = $(`[component="composer"][data-uuid="${uuid}"]`);
								updateComposerBadgeCount(postContainer, postData.polls.length);
							});
							return false;
						},
					},
					close: {
						label: '[[global:close]]',
						className: 'btn-primary',
					},
				},
			});
			handleDelete({ ...payload, modal });
			handleEdit({ ...payload, modal });
			handleSort({ modal, polls: postData.polls });
		}
	}

	async function handleDelete(payload) {
		const bootbox = await app.require('bootbox');
		const { uuid, modal, postData } = payload;
		modal.on('click', 'button[data-action="remove"]', function () {
			const clickedPollId = $(this).attr('data-poll-id');
			bootbox.confirm('[[poll:confirm-remove]]', (ok) => {
				if (!ok) {
					return;
				}
				const poll = postData?.polls.find(poll => String(poll.pollId) === clickedPollId);
				if (poll) {
					postData.polls = postData.polls.filter(poll => String(poll.pollId) !== clickedPollId);
					openManageModal(payload);
					const postContainer = $(`[component="composer"][data-uuid="${uuid}"]`);
					updateComposerBadgeCount(postContainer, postData.polls.length);
				}
			});
		});
	};

	function handleEdit(payload) {
		const { modal, postData } = payload;
		modal.on('click', 'button[data-action="edit"]', async function () {
			const clickedPollId = $(this).attr('data-poll-id');
			const poll = postData?.polls.find(poll => String(poll.pollId) === clickedPollId);
			if (poll) {
				const editedPoll = await Creator.show(poll, config.poll);
				if (editedPoll) {
					postData.polls = postData.polls.map(
						p => String(p.pollId) === String(editedPoll.pollId) ? editedPoll : p
					);
					openManageModal(payload);
				}
			}
		});
	}

	function handleSort({ modal, polls }) {
		if (Array.isArray(polls) && polls.length > 1) {
			const selectorEl = modal.find('.topic-poll-modal');
			selectorEl.sortable({
				handle: '[component="sort/handle"]',
				axis: 'y',
				zIndex: 9999,
				items: '[component="post/poll/item"]',
			});
			selectorEl.on('sortupdate', function () {
				if (!polls) return;
				const newOrder = [];
				selectorEl.find('[component="post/poll/item"]').each(function () {
					const pollId = $(this).attr('data-poll-id');
					const poll = polls.find(p => String(p.pollId) === pollId);
					if (poll) {
						newOrder.push(poll);
					}
				});
				// Mutate polls array in place
				polls.length = 0;
				Array.prototype.push.apply(polls, newOrder);
			});
		}
	};

	Creator.show = function (poll, config) {
		return new Promise((resolve) => {
			require(['bootbox'], function (bootbox) {
				app.parseAndTranslate('poll/creator', { poll, config }, function (html) {
					const modal = bootbox.dialog({
						title: '[[poll:creator_title]]',
						message: html,
						className: 'poll-creator',
						buttons: {
							cancel: {
								label: '[[global:close]]',
								callback: function () {
									resolve(null);
								},
							},
							save: {
								label: '[[modules:bootbox.confirm]]',
								callback: function () {
									clearErrors();
									const form = modal.find('#pollCreator');
									const newPoll = serializeObjectFromForm(form);

									// Let's be nice and at least show an error if there are no options
									if (newPoll.options.length === 0) {
										error('[[poll:error.no_options]]');
										return false;
									}

									resolve(newPoll);
									return true;
								},
							},
						},
					});

					handleOptionSort({ modal });

					// Add option adder
					modal.find('#pollAddOption')
						.off('click')
						.on('click', async function (e) {
							const el = $(e.currentTarget);
							if (config.maxOptions <= el.prevAll('input').length) {
								clearErrors();
								error(`[[poll:error.max_options, ${config.maxOptions}]]`);
								return false;
							}
							const id = Date.now();
							const newOptionInput = await app.parseAndTranslate('poll/option-input', {
								id: id,
								title: '',
							});
							const container = modal.find('#poll-options-container');
							container.append(newOptionInput);
							modal.find(`[data-option-id="${id}"] input`).focus();
						});
				});
			});
		});
	};

	function handleOptionSort({ modal }) {
		const selectorEl = modal.find('#poll-options-container');
		selectorEl.sortable({
			handle: '[component="sort/handle"]',
			axis: 'y',
			zIndex: 9999,
			items: '[component="post/poll/option/item"]',
		});
	}

	async function error(message) {
		const errorBox = $('#pollErrorBox');
		const translator = await app.require('translator');
		const msgTranslated = await translator.translate(message);
		errorBox.removeClass('hidden');
		errorBox.append(msgTranslated + '<br>');
	}

	function clearErrors() {
		$('#pollErrorBox').addClass('hidden').html('');
	}

	function serializeObjectFromForm(form) {
		const obj = form.serializeObject();
		obj.options = obj.options || [];
		obj.id = obj.id || [];

		const options = obj.options.map((opt, index) => ({
			id: obj.id[index],
			title: opt,
		})).filter(option => option.title?.length);

		const result = {
			pollId: obj.pollId,
			options: options,
			title: obj.title,
			maximumVotesPerUser: obj.maximumVotesPerUser,
			disallowVoteUpdate: obj.disallowVoteUpdate === 'on' ? 1 : 0,
			allowAnonVoting: obj.allowAnonVoting === 'on' ? 1 : 0,
			end: obj.end ? new Date(obj.end).getTime() : 0,
		};

		return result;
	}

	function showAlert(type, message) {
		require(['alerts'], function (alerts) {
			alerts[type](message);
		});
	}

	function updateComposerBadgeCount(postContainer, count) {
		require(['composer'], (composer) => {
			composer.updateFormattingBtnBadgeCount(
				postContainer,
				'poll',
				count
			);
		});
	}

	Poll.creator = Creator;

	init();
}(window.Poll));
