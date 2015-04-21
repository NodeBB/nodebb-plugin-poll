(function(Poll) {
	var View = {
		init: function(poll, callback) {
			View.insertPoll(poll, function() {
				var pollView = $('#poll-id-' + poll.info.pollid);

				if (poll.hasvoted || app.uid === 0) {
					View.showResultPanel(pollView);
					//Lets just remove this for now
					pollView.find('#poll-view-button-voting').remove();
				} else {
					View.showVotingPanel(pollView);
				}

				for (var a in View.actions) {
					if (View.actions.hasOwnProperty(a)) {
						View.actions[a].register(pollView);
					}
				}

				if (typeof callback === 'function') {
					callback(pollView);
				}
			});
		},
		get: function(pollid) {
			return $('#poll-id-' + pollid);
		},
		parseResults: function(poll) {
			for (var option in poll.options) {
				if (poll.options.hasOwnProperty(option)) {
					var percentage = ((poll.options[option].votecount / poll.info.votecount) * 100).toFixed(1);
					poll.options[option].percentage = isNaN(percentage) ? 0 : percentage;
				}
			}
			return poll;
		},
		parsePoll: function(poll, callback) {
			poll = View.parseResults(poll);

			//Todo REMOVE BEFORE RELEASE
			//Development compatibility
			if (poll.info.title) {
				poll.settings.title = poll.info.title;
			}

			if (parseInt(poll.settings.maxvotes, 10) > 1) {
				poll.optiontype = 'checkbox';
			} else {
				poll.optiontype = 'radio';
			}

			window.templates.parse('poll/view', poll, function(html){
				var plugPath = '/plugins/nodebb-plugin-poll/public',
					relPath = config.relative_path;

				config.relative_path = plugPath;
				translator.translate(html, config.userLang, function(translatedHtml) {
					callback(translatedHtml);
				});
				config.relative_path = relPath;
			});
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
		//Todo tidy this up, better individual panel and button control
		showVotingPanel: function(pollView) {
			View.hideResultPanel(pollView);
			pollView.find('.poll-view-options').removeClass('hidden');
			pollView.find('#poll-view-button-vote').removeClass('hidden');
			pollView.find('#poll-view-button-results').removeClass('hidden');
		},
		hideVotingPanel: function(pollView) {
			pollView.find('.poll-view-options').addClass('hidden');
			pollView.find('#poll-view-button-vote').addClass('hidden');
			pollView.find('#poll-view-button-results').addClass('hidden');
		},
		showResultPanel: function(pollView) {
			View.hideVotingPanel(pollView);
			pollView.find('.poll-view-results').removeClass('hidden');
			pollView.find('#poll-view-button-voting').removeClass('hidden');
		},
		hideResultPanel: function(pollView) {
			pollView.find('.poll-view-results').addClass('hidden');
			pollView.find('#poll-view-button-voting').addClass('hidden');
		},
		showMessage: function(message, pollView) {
			View.hideVotingPanel(pollView);
			window.templates.parse('poll/view/messages', message, function(html) {
				var plugPath = '/plugins/nodebb-plugin-poll/public',
					relPath = config.relative_path;

				config.relative_path = plugPath;
				translator.translate(html, config.userLang, function(translatedHtml) {
					pollView.find('.poll-view-messages').html(translatedHtml).removeClass('hidden');
				});
				config.relative_path = relPath;
			});
		},
		hideMessage: function(pollView) {
			pollView.find('.poll-view-messages').addClass('hidden');
		},
		showOptionDetails: function(details) {
			window.templates.parse('poll/view/details', details, function(html) {
				bootbox.alert(html);
			});
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
			},
			optionDetails: {
				register: function(pollView) {
					pollView.find('.poll-view-result-votecount').off('click').on('click', this.handle);
				},
				handle: function(e) {
					var option = $(e.currentTarget).parents('[data-poll-result]'),
						poll = option.parents('[data-pollid]');

					Poll.sockets.emit.getDetails({
						pollid: poll.data('pollid'),
						option: option.data('poll-result')
					}, function(err, result) {
						if (err) {
							app.alertError(err.message);
						} else {
							View.showOptionDetails(result);
						}
					});

					return false;
				}
			}
		}
	};

	Poll.view = {
		init: View.init,
		get: View.get,
		update: View.update,
		updateResults: View.updateResults,
		showMessage: View.showMessage
	};
})(window.Poll);
