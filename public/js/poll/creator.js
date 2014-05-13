(function(Poll) {
	var S,
		settings = {
			max: {
				test: function(value) {
					return !isNaN(value);
				}
			},
			title: {
				test: function(value) {
					return value.length > 0;
				}
			},
			end: {
				test: function(value) {
					return moment(value).isValid();
				},
				parse: function(value) {
					return moment(value).unix();
				}
			}
		};

	//Todo: load settings (like option limit) from server

	function initialise() {
		require(['composer', 'string'], function(composer, String) {
			S = String;
			composer.addButton('fa fa-bar-chart-o', Poll.creator.show);
		});
	}

	initialise();

	Poll.creator = {
		show: function(textarea) {
			window.templates.parse('poll/creator', {}, function(html) {
				bootbox.dialog({
					title: 'Create a poll',
					message: html,
					buttons: {
						cancel: {
							label: 'Cancel',
							className: 'btn-default',
							callback: function(e) {
								return Poll.creator.cancel(e, textarea);
							}
						},
						save: {
							label: 'Done',
							className: 'btn-primary',
							callback: function(e) {
								return Poll.creator.save(e, textarea);
							}
						}
					}
				}).find('#pollInputEnd').datetimepicker({
						useSeconds: false,
						useCurrent: false,
						minDate: new Date(),
						icons: {
							time: "fa fa-clock-o",
							date: "fa fa-calendar",
							up: "fa fa-arrow-up",
							down: "fa fa-arrow-down"
						}
					});
			});
		},
		cancel: function(e, textarea) {
			return true;
		},
		save: function(e, textarea) {
			var modal = $(e.currentTarget).parents('.bootbox'),
				errorBox = modal.find('#pollErrorBox');

			errorBox.addClass('hidden').html('');

			var result = Creator.parse(modal);
			if (result.err) {
				return Poll.creator.error(errorBox, result.err);
			} else {
				if (textarea.value.charAt(textarea.value.length - 1) !== '\n') {
					result.markup = '\n' + result.markup;
				}
				textarea.value += result.markup;
				return true;
			}
		},
		error: function(errorBox, message) {
			errorBox.removeClass('hidden');
			errorBox.append(message + '<br>');
			return false;
		}
	};

	var Creator = {
		parse: function(modal) {
			var options = S(modal.find('#pollInputOptions').val()).stripTags().s.split('\n').filter(function(o) {
					return o.length == 0 ? false : o;
				}),
				settingMarkup = '',
				result = {
					err: null,
					markup: null
				};

			if (options.length == 0) {
				result.err = 'Create at least one option!';
				return result;
			}

			for (var s in settings) {
				if (settings.hasOwnProperty(s)) {
					var value = S(modal.find('[data-poll-setting="' + s + '"]').val()).stripTags().trim().s;
					if (value.length > 0 && settings[s].test(value)) {
						if (typeof settings[s].parse === 'function') {
							value = settings[s].parse(value);
						}
						settingMarkup += ' ' + s + '="' + value + '"';
					}
				}
			}

			result.markup = '[poll' + settingMarkup + ']\n';
			for (var i = 0, l = options.length; i < l; i++) {
				result.markup += '- ' + options[i] + '\n';
			}
			result.markup += '[/poll]\n';

			return result;
		}
	};
})(window.Poll);