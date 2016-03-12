"use strict";
/* globals $, app */

(function(Poll) {

	var View = function(pollData) {
		this.pollData = pollData;
	};

	View.prototype.load = function() {
		var self = this;

		require(['components'], function(components) {
			posts = components.get('post');
			if (posts.length > 0 && parseInt(posts.eq(0).data('pid'), 10) === parseInt(self.pollData.info.pid, 10)) {
				app.parseAndTranslate('poll/view', {poll: self.pollData}, function(html) {
					posts.eq(0).find('[component="post/content"]').prepend(html);

					var panel = $('[data-poll-id=' + self.pollData.info.pollId + ']');

					self.dom = {
						panel: panel,
						messages: panel.find('.poll-view-messages'),
						votingPanel: panel.find('.poll-view-voting'),
						resultsPanel: panel.find('.poll-view-results'),
						voteButton: panel.find('.poll-button-vote'),
						votingPanelButton: panel.find('.poll-button-voting'),
						resultsPanelButton: panel.find('.poll-button-results')
					};

					self.hideMessage();

					self.pollEndedOrDeleted();

					if (!app.user.uid || self.pollData.hasVoted) {
						self.showResultsPanel();
						self.hideVotingPanelButton();
					}

					Actions.forEach(function(action) {
						action.register(self);
					});
				});
			}
		});
	};

	View.prototype.pollEndedOrDeleted = function() {
		if (parseInt(this.pollData.info.ended, 10) === 1 || parseInt(this.pollData.info.deleted, 10) === 1) {
			this.showResultsPanel();
			this.hideVotingPanelButton();
			this.showMessage('[[poll:voting_unavailable_title]]', '[[poll:voting_unavailable_message]]');
		}
	};

	View.prototype.update = function(pollData) {
		this.pollData = pollData;

		this.pollEndedOrDeleted();

		this.pollData.options.forEach(function(option) {
			var el = this.dom.resultsPanel.find('[data-poll-option-id=' + option.id + ']');
			el.find('.poll-result-votecount span').text(option.voteCount);
			el.find('.poll-result-progressbar').css('width', option.percentage + '%')
				.find('span').text(option.percentage);
		}, this);
	};

	View.prototype.showMessage = function(title, content) {
		var self = this;

		app.parseAndTranslate('poll/view/messages', {title: title, content: content}, function(html) {
			self.dom.messages.html(html).removeClass('hidden');
		});
	};

	View.prototype.hideMessage = function() {
		this.dom.messages.addClass('hidden');
	};

	View.prototype.showOptionDetails = function(details) {
		app.parseAndTranslate('poll/view/details', details, function(html) {
			bootbox.dialog({
				message: html,
				buttons: {
					close: {
						label: 'Close'
					}
				}
			});
		})
	};

	View.prototype.showVotingPanel = function() {
		this.hideResultsPanel();
		this.showVoteButton();
		this.showResultsPanelButton();
		this.dom.votingPanel.removeClass('hidden');
	};

	View.prototype.hideVotingPanel = function() {
		this.hideVoteButton();
		this.hideResultsPanelButton();
		this.dom.votingPanel.addClass('hidden');
	};

	View.prototype.showResultsPanel = function() {
		this.hideVotingPanel();
		this.showVotingPanelButton();
		this.dom.resultsPanel.removeClass('hidden');
	};

	View.prototype.hideResultsPanel = function() {
		this.hideVotingPanelButton();
		this.dom.resultsPanel.addClass('hidden');
	};

	View.prototype.showVoteButton = function() {
		this.dom.voteButton.removeClass('hidden');
	};

	View.prototype.hideVoteButton = function() {
		this.dom.voteButton.addClass('hidden');
	};

	View.prototype.showVotingPanelButton = function() {
		this.dom.votingPanelButton.removeClass('hidden');
	};

	View.prototype.hideVotingPanelButton = function() {
		this.dom.votingPanelButton.addClass('hidden');
	};

	View.prototype.showResultsPanelButton = function() {
		this.dom.resultsPanelButton.removeClass('hidden');
	};

	View.prototype.hideResultsPanelButton = function() {
		this.dom.resultsPanelButton.addClass('hidden');
	};

	var Actions = [
		{
			// Voting
			register: function(view) {
				var self = this;
				view.dom.voteButton.off('click').on('click', function() {
					self.handle(view);
				});
			},
			handle: function(view) {
				var form = view.dom.votingPanel.find('form');
				var votes = form.serializeArray().map(function(option) {
					return parseInt(option.value, 10);
				});

				if (votes.length > 0) {
					var voteData = {
						pollId: view.pollData.info.pollId,
						options: votes
					};

					Poll.sockets.vote(voteData, function(err, result) {
						if (err) {
							return app.alertError(err.message);
						}

						view.showResultsPanel();
						view.hideVotingPanelButton();
					});
				}
			}
		},
		{
			// Results button
			register: function(view) {
				var self = this;
				view.dom.resultsPanelButton.off('click').on('click', function() {
					self.handle(view);
				});
			},
			handle: function(view) {
				view.showResultsPanel();
			}
		},
		{
			// To Voting button
			register: function(view) {
				var self = this;
				view.dom.votingPanelButton.off('click').on('click', function() {
					self.handle(view);
				});
			},
			handle: function(view) {
				view.showVotingPanel()
			}
		},
		{
			// Option details
			register: function(view) {
				var self = this;
				view.dom.resultsPanel.off('click').on('click', '.poll-result-votecount', function(e) {
					self.handle(view, e);
				});
			},
			handle: function(view, e) {
				var optionId = $(e.currentTarget).parents('[data-poll-option-id]').data('poll-option-id');

				Poll.sockets.getOptionDetails({
					pollId: view.pollData.info.pollId,
					optionId: optionId
				}, function(err, details) {
					if (err) {
						return app.alertError(err.message);
					}

					view.showOptionDetails(details);
				});
			}
		}
	];

	Poll.view = {
		polls: {},
		load: function(pollData) {
			var view = new View(pollData);
			this.polls[pollData.info.pollId] = view;

			view.load();
		},
		update: function(pollData) {
			var pollId = pollData.info.pollId;
			if (this.polls.hasOwnProperty(pollId)) {
				this.polls[pollId].update(pollData);
			}
		}
	};
})(window.Poll);
