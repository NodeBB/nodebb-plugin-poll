"use strict";
/* globals $, app, templates, define */

(function(Poll) {

	var Creator = {};

	function init() {
		$(window).on('action:composer.enhanced', initComposer);

		$(window).on('action:redactor.load', initRedactor);

		$(window).on('action:composer.loaded', function(ev, data) {
			if ($.Redactor) {
				if (data.composerData.isMain && $.Redactor.opts.plugins.indexOf('poll') === -1) {
					$.Redactor.opts.plugins.push('poll');
				} else if (!data.composerData.isMain && $.Redactor.opts.plugins.indexOf('poll') !== -1) {
					$.Redactor.opts.plugins.splice($.Redactor.opts.plugins.indexOf('poll'), 1);
				}
			}
		});
	}

	function initComposer() {
		require(['composer', 'composer/formatting', 'composer/controls'], function(composer, formatting, controls) {
			if (formatting && controls) {
				formatting.addButtonDispatch('poll', function(textarea) {
					composerBtnHandle(composer, textarea);
				});
			}
		});
	}

	function initRedactor() {
		$.Redactor.prototype.poll = function () {
			return {
				init: function () {
					var self = this;

					// require translator as such because it was undefined without it
					require(['translator'], function (translator) {
						translator.translate('[[poll:creator_title]]', function(translated) {
							var button = self.button.add('poll', translated);
							self.button.setIcon(button, '<i class="fa fa-bar-chart-o"></i>');
							self.button.addCallback(button, self.poll.onClick);
						});
					})
				},
				onClick: function () {
					var self = this;
					var code = this.code.get();
					require(['composer'], function(composer) {
						composerBtnHandle(composer, {
							value: code,
							redactor: function (code) {
								self.code.set(code);
							}
						});
					});
				}
			};
		};
	}

	function composerBtnHandle(composer, textarea) {
		require(['composer/controls'], function(controls) {
			var post = composer.posts[composer.active];
			if (!post || !post.isMain || (isNaN(parseInt(post.cid, 10)) && isNaN(parseInt(post.pid, 10)))) {
				return app.alertError('[[poll:error.not_main]]');
			}
			if (parseInt(post.cid, 10) === 0) {
				return app.alertError("[[error:category-not-selected]]");
			}

			Poll.sockets.canCreate({cid: post.cid, pid: post.pid}, function(err, canCreate) {
				if (err || !canCreate) {
					return app.alertError(err.message);
				}

				Poll.sockets.getConfig(null, function(err, config) {
					var poll = {};

					// If there's already a poll in the post, serialize it for editing
					if (Poll.serializer.canSerialize(textarea.value)) {
						poll = Poll.serializer.serialize(textarea.value, config);

						if (poll.settings.end === 0) {
							delete poll.settings.end;
						} else {
							poll.settings.end = parseInt(poll.settings.end, 10);
						}
					}

					Creator.show(poll, config, function(data) {
						// Anything invalid will be discarded by the serializer
						var markup = Poll.serializer.deserialize(data, config);

						// Remove any existing poll markup
						textarea.value = Poll.serializer.removeMarkup(textarea.value);

						// Insert the poll markup at the bottom
						if (textarea.value.charAt(textarea.value.length - 1) !== '\n') {
							markup = '\n' + markup;
						}

						if ($.Redactor) {
							textarea.redactor(textarea.value + '<p>' + markup + '</p>');
						} else {
							controls.insertIntoTextarea(textarea, markup);
						}
					});
				});
			});
		});
	}

	Creator.show = function(poll, config, callback) {
		if (poll.hasOwnProperty('info')) {
			return app.alertError('Editing not implemented.');
		}

		require(['flatpickr', 'flatpickr.i10n', 'bootbox', 'dayjs', 'translator'], function (flatpickr, flatpickrI10N, bootbox, dayjs, Translator) {
			app.parseAndTranslate('poll/creator', { poll: poll, config: config, isRedactor: !!$.Redactor }, function(html) {
				// Initialise modal
				var modal = bootbox.dialog({
					title: '[[poll:creator_title]]',
					message: html,
					className: 'poll-creator',
					buttons: {
						cancel: {
							label: '[[modules:bootbox.cancel]]',
							className: 'btn-default',
							callback: function() {
								return true
							}
						},
						save: {
							label: '[[modules:bootbox.confirm]]',
							className: 'btn-primary',
							callback: function(e) {
								clearErrors();
								var form = $(e.currentTarget).parents('.bootbox').find('#pollCreator');
								var obj = form.serializeObject();

								// Let's be nice and at least show an error if there are no options
								obj.options.filter(function(obj) {
									return obj.length;
								});

								if (obj.options.length == 0) {
									return error('[[poll:error.no_options]]');
								}

								if (obj.settings.end && !dayjs(new Date(obj.settings.end)).isValid()) {
									return error('[[poll:error.valid_date]]');
								} else if (obj.settings.end) {
									obj.settings.end = dayjs(new Date(obj.settings.end)).valueOf();
								}

								callback(obj);
								return true;
							}
						}
					}
				});

				// Add option adder
				modal.find('#pollAddOption')
					.off('click')
					.on('click', function(e) {
						var el = $(e.currentTarget);
						var prevOption = el.prev();

						if (config.limits.maxOptions <= el.prevAll('input').length) {
							clearErrors();
							translator.translate('[[poll:error.max_options]]', function(text) {
								error(text.replace('%d', config.limits.maxOptions));
							});
							return false;
						}

						if (prevOption.val().length != 0) {
							prevOption.clone().val('').insertBefore(el).focus();
						}
					});

				var currentLocale = Translator.getLanguage();
				flatpickr(".flatpickr", {
					enableTime: true,
					altFormat: "F j, Y h:i K",
					time_24hr: false,
					wrap: true,
					locale: getFlatpickrLocale(currentLocale, flatpickrI10N.default),
					onOpen: function() {
						modal.removeAttr('tabindex');
					},
					onClose: function() {
						modal.attr('tabindex', -1);
					}
				});

				if (poll.settings && poll.settings.end) {
					flatpickr.setDate(poll.settings.end)
				}
			});
		});
	};

	function error(message) {
		var errorBox = $('#pollErrorBox');

		errorBox.removeClass('hidden');
		errorBox.append(message + '<br>');

		return false;
	}

	function clearErrors() {
		$('#pollErrorBox').addClass('hidden').html('');
	}

	function getFlatpickrLocale(nodebbLocale, flatpickrLocales = {}) {
		if (Object.keys(flatpickrLocales).includes(nodebbLocale.toLowerCase())) {
			return flatpickrLocales[nodebbLocale];
		}
		return flatpickrLocales['default'];
	}

	Poll.creator = Creator;

	init();

})(window.Poll);
