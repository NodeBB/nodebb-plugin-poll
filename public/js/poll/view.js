(function(Poll) {
	var View = {
		parseResults: function(poll) {
			for (var option in poll.options) {
				if (poll.options.hasOwnProperty(option)) {
					var percentage = (poll.options[option].votecount / poll.votecount) * 100;
					poll.options[option].percentage = isNaN(percentage) ? 0 : percentage;
				}
			}
			return poll;
		},
		parsePoll: function(poll, callback) {
			poll = View.parseResults(poll);
			console.log(poll);
			window.templates.parse('poll/view', poll, callback);
		},
		insertPoll: function(poll, callback) {
			View.parsePoll(poll, function(html) {
				$('#post-container .post-row[data-index="0"] .post-content').prepend(html);
				callback();
			});
		},
		parseVote: function(form) {
			var serialized = form.serializeArray(),
				votes = [];

			for (var input in serialized) {
				if (serialized.hasOwnProperty(input)) {
					votes.push(serialized[input].value);
				}
			}

			return {
				pollid: form.parents('[data-pollid]').data('pollid'),
				options: votes
			}
		},
		updateResults: function(poll, pollView) {
			poll = View.parseResults(poll);
			for (var i = 0, l = poll.options.length; i < l; i++) {
				var option = poll.options[i],
					optionView = pollView.find('#pollResult' + option.id);
				optionView.find('.poll-view-result-percentage').text(option.percentage + '%');
				optionView.find('.poll-view-result-progressbar').css('width', option.percentage + '%');
			}
		},
		showVotingPanel: function(pollView) {
			pollView.find('.poll-view-options').removeClass('hidden');
			pollView.find('.poll-view-results').addClass('hidden');
			pollView.find('#poll-view-button-vote').removeClass('hidden');
			pollView.find('#poll-view-button-results').removeClass('hidden');
			pollView.find('#poll-view-button-voting').addClass('hidden');
		},
		showResultPanel: function(pollView) {
			pollView.find('.poll-view-options').addClass('hidden');
			pollView.find('.poll-view-results').removeClass('hidden');
			pollView.find('#poll-view-button-vote').addClass('hidden');
			pollView.find('#poll-view-button-results').addClass('hidden');
			pollView.find('#poll-view-button-voting').removeClass('hidden');
		},
		actions: {
			vote: {
				register: function(pollView) {
					pollView.find('#poll-view-button-vote').off('click').on('click', function(e) {
						View.actions.vote.handle(pollView);
					});
				},
				handle: function(pollView) {
					var voteData = View.parseVote(pollView.find('form'));
					if (voteData.options.length > 0) {
						Poll.sockets.emit.vote(voteData, function(err, result) {
							if (err) {
								app.alertError(err.message);
							} else {
								View.showResultPanel(pollView);
								pollView.find('#poll-view-button-voting').remove();
							}
						});
					}
				}
			},
			results: {
				register: function(pollView) {
					pollView.find('#poll-view-button-results').off('click').on('click', function(e) {
						View.actions.results.handle(pollView);
					});
				},
				handle: function(pollView) {
					View.showResultPanel(pollView);
				}
			},
			voting: {
				register: function(pollView) {
					pollView.find('#poll-view-button-voting').off('click').on('click', function(e) {
						View.actions.voting.handle(pollView);
					});
				},
				handle: function(pollView) {
					View.showVotingPanel(pollView);
				}
			}
		}
	}

	Poll.view = {
		init: function(poll) {
			View.insertPoll(poll, function() {
				var pollView = $('#poll-id-' + poll.pollid);
				console.log(poll.hasvoted);
				if (poll.hasvoted) {
					View.showResultPanel(pollView);
					pollView.find('#poll-view-button-voting').remove();
				} else {
					View.showVotingPanel(pollView);
				}

				for (var a in View.actions) {
					if (View.actions.hasOwnProperty(a)) {
						View.actions[a].register(pollView);
					}
				}
			});
		},
		update: View.update,
		updateResults: View.updateResults
	};
})(window.Poll);
