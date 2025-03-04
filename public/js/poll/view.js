'use strict';

(function (Poll) {
	function vote(view, options) {
		var form = view.dom.votingPanel.find('form');
		var votes = form.serializeArray().map(function (option) {
			return parseInt(option.value, 10);
		});

		if (votes.length > 0) {
			var voteData = {
				pollId: view.pollData.info.pollId,
				options: votes,
				voteAnon: options.voteAnon,
			};

			socket.emit('plugins.poll.vote', voteData, function (err) {
				if (!config.loggedIn) {
					$(window).trigger('action:poll.vote.notloggedin');
				}

				if (err) {
					return Poll.alertError(err.message);
				}

				view.showResultsPanel();
			});
		}
	}

	var Actions = [
		{
			// Voting
			register: function (view) {
				var self = this;
				view.dom.voteButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				vote(view, {
					voteAnon: false,
				});
			},
		},
		{
			// vote anon
			register: function (view) {
				var self = this;
				view.dom.voteAnonButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				vote(view, {
					voteAnon: true,
				});
			},
		},
		{
			// update voting
			register: function (view) {
				var self = this;
				view.dom.updateVoteButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				var form = view.dom.votingPanel.find('form');
				var votes = form.serializeArray().map(function (option) {
					return parseInt(option.value, 10);
				});

				if (votes.length > 0) {
					var voteData = {
						pollId: view.pollData.info.pollId,
						options: votes,
					};
					socket.emit('plugins.poll.updateVote', voteData, function (err) {
						if (err) {
							return Poll.alertError(err.message);
						}
						view.showResultsPanel();
					});
				}
			},
		},
		{
			// Remove vote
			register: function (view) {
				var self = this;
				view.dom.removeVoteButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				var voteData = { pollId: view.pollData.info.pollId };

				socket.emit('plugins.poll.removeVote', voteData, function (err) {
					if (err) {
						return Poll.alertError(err.message);
					}
					view.showResultsPanel();
				});
			},
		},
		{
			// Results button
			register: function (view) {
				var self = this;
				view.dom.resultsPanelButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				view.showResultsPanel();
			},
		},
		{
			// To Voting button
			register: function (view) {
				var self = this;
				view.dom.votingPanelButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				view.showVotingPanel();
			},
		},
		{
			// Option details
			register: function (view) {
				var self = this;
				view.dom.resultsPanel.off('click').on('click', '.poll-result-votecount', function (e) {
					self.handle(view, e);
				});
			},
			handle: function (view, e) {
				var optionId = $(e.currentTarget).parents('[data-poll-option-id]').data('poll-option-id');

				socket.emit('plugins.poll.getOptionDetails', {
					pollId: view.pollData.info.pollId,
					optionId: optionId,
				}, function (err, details) {
					if (err) {
						return Poll.alertError(err.message);
					}

					view.showOptionDetails(details);
				});
			},
		},
		{
			// Editing
			register: function (view) {
				var self = this;
				view.dom.editButton.off('click').on('click', function () {
					self.handle(view);
				});
			},
			handle: function (view) {
				socket.emit('plugins.poll.getConfig', null, function (err, config) {
					if (err) {
						console.error(err);
					}
					Poll.creator.show(view.pollData, config, function () {});
				});
			},
		},
	];

	var View = function (pollData) {
		this.pollData = pollData;
	};

	View.prototype.load = function () {
		var self = this;
		if (!self.pollData.container.length) {
			return;
		}

		app.parseAndTranslate('poll/view', { poll: self.pollData }, function (panel) {
			self.pollData.container.prepend(panel);
			self.dom = {
				panel: panel,
				votingForm: panel.find('.poll-voting-form'),
				messages: panel.find('.poll-view-messages'),
				votingPanel: panel.find('.poll-view-voting'),
				resultsPanel: panel.find('.poll-view-results'),
				voteButton: panel.find('.poll-button-vote'),
				voteAnonButton: panel.find('.poll-button-vote-anon'),
				updateVoteButton: panel.find('.poll-button-update-vote'),
				removeVoteButton: panel.find('.poll-button-remove-vote'),
				votingPanelButton: panel.find('.poll-button-voting'),
				resultsPanelButton: panel.find('.poll-button-results'),
				editButton: panel.find('.poll-button-edit'),
			};

			self.hideMessage();

			self.pollEndedOrDeleted();
			self.hasVotedAndVotingUpdateDisallowed();

			if (!app.user.uid || self.pollData.hasVoted) {
				self.showResultsPanel();
			} else {
				self.showVotingPanel();
			}

			Actions.forEach(function (action) {
				action.register(self);
			});
		});
	};

	View.prototype.hasPollEndedOrDeleted = function () {
		return (parseInt(this.pollData.info.ended, 10) === 1 || parseInt(this.pollData.info.deleted, 10) === 1);
	};

	View.prototype.voteUpdateAllowed = function () {
		return parseInt(this.pollData.settings.disallowVoteUpdate, 10) !== 1;
	};

	View.prototype.pollEndedOrDeleted = function () {
		if (this.hasPollEndedOrDeleted()) {
			this.showResultsPanel();
			this.hideVotingPanelButton();
			this.showMessage('[[poll:voting_unavailable_title]]', '[[poll:voting_unavailable_message]]');
		}
	};

	View.prototype.hasVotedAndVotingUpdateDisallowed = function () {
		if (this.pollData.hasVoted && !this.voteUpdateAllowed()) {
			this.showResultsPanel();
			this.hideVotingPanelButton();
			this.showMessage('[[poll:voting_unavailable_title]]', '[[poll:voting_update_disallowed_message]]');
		}
	};

	View.prototype.update = function (pollData, uid) {
		const isSelf = String(uid) === String(app.user.uid);
		const hasVoted = this.pollData.hasVoted;
		const vote = this.pollData.vote;
		this.pollData = pollData;
		if (!isSelf) {
			// restore user specific data if update is not self
			this.pollData.hasVoted = hasVoted;
			this.pollData.vote = vote;
		}

		this.pollEndedOrDeleted();

		this.pollData.options.forEach(function (option) {
			var el = this.dom.resultsPanel.find('[data-poll-option-id=' + option.id + ']');
			el.find('.poll-result-votecount span').translateText(`[[poll:x-votes, ${option.voteCount}]]`);
			el.find('.poll-result-progressbar').css('width', option.percentage + '%')
				.find('span.percent').text(option.percentage);
		}, this);

		this.dom.resultsPanel
			.find('.poll-result-total-votecount')
			.translateText(`[[poll:total-votes-x, ${pollData.info.voteCount}]]`);
	};

	View.prototype.showMessage = function (title, content) {
		var self = this;

		app.parseAndTranslate('poll/view/messages', { title: title, content: content }, function (html) {
			self.dom.messages.html(html).removeClass('hidden');
		});
	};

	View.prototype.hideMessage = function () {
		this.dom.messages.addClass('hidden');
	};

	View.prototype.showOptionDetails = function (details) {
		require(['bootbox'], function (bootbox) {
			app.parseAndTranslate('poll/view/details', details, function (html) {
				bootbox.dialog({
					message: html,
					backdrop: true,
					buttons: {
						close: {
							label: 'Close',
						},
					},
				});
			});
		});
	};

	View.prototype.fillVotingForm = function () {
		var self = this;
		this.resetVotingForm();
		if (this.pollData.vote && this.pollData.vote.options) {
			this.pollData.vote.options.forEach(function (id) {
				self.dom.votingForm
					.find('[data-poll-option-id="' + id + '"].poll-view-option input')
					.prop('checked', true);
			});
		}
	};

	View.prototype.resetVotingForm = function () {
		this.dom.votingForm.get(0).reset();
	};

	View.prototype.showVotingPanel = function () {
		this.hideResultsPanel();
		this.showResultsPanelButton();
		if (this.pollData.hasVoted) {
			if (this.voteUpdateAllowed() && !this.hasPollEndedOrDeleted()) {
				this.showUpdateVoteButton();
				this.showRemoveVoteButton();
				this.fillVotingForm();
			}
		} else {
			this.showVoteButton();
			if (this.pollData.settings.allowAnonVoting) {
				this.showVoteAnonButton();
			}
		}
		this.dom.votingPanel.removeClass('hidden');
	};

	View.prototype.hideVotingPanel = function () {
		this.hideResultsPanelButton();
		this.hideUpdateVoteButton();
		this.hideRemoveVoteButton();
		this.resetVotingForm();
		this.hideVoteButton();
		this.hideVoteAnonButton();
		this.dom.votingPanel.addClass('hidden');
	};

	View.prototype.showResultsPanel = function () {
		this.hideVotingPanel();
		if ((!this.pollData.hasVoted || this.voteUpdateAllowed()) && !this.hasPollEndedOrDeleted()) {
			this.showVotingPanelButton();
		} else {
			this.hideVotingPanelButton();
		}
		this.dom.resultsPanel.removeClass('hidden');
	};

	View.prototype.hideResultsPanel = function () {
		this.hideVotingPanelButton();
		this.dom.resultsPanel.addClass('hidden');
	};

	View.prototype.showVoteButton = function () {
		this.dom.voteButton.removeClass('hidden');
	};

	View.prototype.hideVoteButton = function () {
		this.dom.voteButton.addClass('hidden');
	};

	View.prototype.showVoteAnonButton = function () {
		this.dom.voteAnonButton.removeClass('hidden');
	};

	View.prototype.hideVoteAnonButton = function () {
		this.dom.voteAnonButton.addClass('hidden');
	};

	View.prototype.showUpdateVoteButton = function () {
		this.dom.updateVoteButton.removeClass('hidden');
	};

	View.prototype.hideUpdateVoteButton = function () {
		this.dom.updateVoteButton.addClass('hidden');
	};

	View.prototype.showRemoveVoteButton = function () {
		this.dom.removeVoteButton.removeClass('hidden');
	};

	View.prototype.hideRemoveVoteButton = function () {
		this.dom.removeVoteButton.addClass('hidden');
	};

	View.prototype.showVotingPanelButton = function () {
		this.dom.votingPanelButton.removeClass('hidden');
	};

	View.prototype.hideVotingPanelButton = function () {
		this.dom.votingPanelButton.addClass('hidden');
	};

	View.prototype.showResultsPanelButton = function () {
		this.dom.resultsPanelButton.removeClass('hidden');
	};

	View.prototype.hideResultsPanelButton = function () {
		this.dom.resultsPanelButton.addClass('hidden');
	};

	Poll.view = {
		polls: {},
		load: function (pollData) {
			var view = new View(pollData);
			this.polls[pollData.info.pollId] = view;

			view.load();
		},
		update: function (pollData, uid) {
			var pollId = pollData.info.pollId;
			if (this.polls.hasOwnProperty(pollId)) {
				this.polls[pollId].update(pollData, uid);
			}
		},
	};
}(window.Poll));
