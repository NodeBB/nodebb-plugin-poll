(function(Poll) {
	var S,
		settings = {
			max: {
				id: 'pollInputAmount',
				test: function(value) {
					return !isNaN(value);
				}
			},
			title: {
				id: 'pollInputTitle',
				test: function(value) {
					return value.length > 0;
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
								Poll.creator.cancel(e, textarea);
							}
						},
						save: {
							label: 'Done',
							className: 'btn-primary',
							callback: function(e) {
								Poll.creator.save(e, textarea);
							}
						}
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
				return Poll.creator.error(errorBox, err);
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
				if (options.length == 0) {
					result.err = 'Create at least one option!';
				}
				return result;
			}

			for (var s in settings) {
				if (settings.hasOwnProperty(s)) {
					var value = S(modal.find('#' + settings[s].id).val()).stripTags().trim().s;
					if (settings[s].test(value)) {
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