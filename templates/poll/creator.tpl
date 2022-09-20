<form class="form" id="pollCreator">
    <div id="pollErrorBox" class="alert alert-danger hidden"></div>

    <div class="mb-3">
        <label class="form-label" for="pollInputTitle">[[poll:poll_title]]</label>
        <input type="text" name="settings.title" id="pollInputTitle" value="{poll.settings.title}" placeholder="[[poll:poll_title_placeholder]]" class="form-control">
    </div>

    <div class="mb-3">
        <label class="form-label" for="pollInputOptions">[[poll:options_title]]</label>
        <!-- IF poll.options.length -->
        <!-- BEGIN poll.options -->
        <input type="text" name="options" id="pollInputOptions" value="{@value}" class="form-control mb-2"/>
        <!-- END poll.options -->
        <!-- ELSE -->
        <input type="text" name="options" id="pollInputOptions" class="form-control mb-2"/>
        <!-- ENDIF poll.options.length -->
        <button type="button" id="pollAddOption" class="btn btn-primary btn-sm btn-block">[[poll:options_add]]</button>
    </div>

    <hr>

    <div class="mb-3">
        <label class="form-label" for="pollInputAmount">[[poll:max_votes]]</label>
        <input type="number" name="settings.maxvotes" id="pollInputAmount" value="{poll.settings.maxvotes}"
               min="1" max="10" step="1" placeholder="[[poll:max_votes_placeholder]]" class="form-control">
    </div>

    <div class="mb-3">
        <div class="form-check">
            <label class="form-check-label" for="pollDisallowVoteUpdate">[[poll:disallow_vote_update]]</label>
            <input class="form-check-input" type="checkbox" name="settings.disallowVoteUpdate" id="pollDisallowVoteUpdate" {{{if poll.settings.disallowVoteUpdate}}}checked{{{end}}}>
        </div>
    </div>

    <div class="mb-3">
        <label class="form-label" for="pollInputEnd">[[poll:auto_end_title]]</label>
        <div class="input-group date flatpickr">
            <input id="pollInputEnd" placeholder="[[poll:auto_end_placeholder]]" name="settings.end" class="form-control" value="{poll.settings.end}" data-input>
            <a class="input-group-text" data-toggle><i class="fa fa-calendar"></i></a>
        </div>
        <p class="form-text">[[poll:auto_end_help]]</p>
    </div>

    {{{ if isRedactor }}}
    <div class="alert alert-warning" role="alert">
        [[poll:warning.redactor]]
    </div>
    {{{ end }}}
</form>
