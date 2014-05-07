(function(Poll) {
	var S;

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
			var title = modal.find('#pollInputTitle').val(),
				options = S(modal.find('#pollInputOptions').val()).stripTags().s.split('\n').filter(function(o) {
					return o.length == 0 ? false : o;
				}),
				amount = parseInt(modal.find('#pollInputAmount').val(), 10),
				result = {
					err: null,
					markup: null
				};

			if (title.length == 0 || options.length == 0 || (isNaN(amount) || amount <= 0)) {
				if (title.length == 0) {
					result.err = 'Invalid title';
				}
				if (options.length == 0) {
					result.err = 'Create at least one option!';
				}
				if (isNaN(amount)) {
					result.err = 'Invalid vote amount input!';
				}
				return result;
			}

			result.markup = '\n[poll]\n';
			for (var i = 0, l = options.length; i < l; i++) {
				result.markup += '- ' + options[i] + '\n';
			}
			result.markup += '[/poll]\n';

			return result;
		}
	}
})(window.Poll);