<form class="form" id="pollCreator" onsubmit="return false;">
    <div id="pollErrorBox" class="alert alert-danger hidden"></div>

    <input type="hidden" name="pollId" value="{poll.pollId}">

    <div class="mb-3">
        <label class="form-label" for="pollInputTitle">[[poll:poll_title]]</label>
        <input type="text" name="title" id="pollInputTitle" value="{poll.title}" placeholder="[[poll:poll_title_placeholder]]" class="form-control">
    </div>

    <div class="mb-3 d-flex flex-column gap-1">
        <label class="form-label" for="pollInputOptions">[[poll:options_title]]</label>
        <div id="poll-options-container" class="d-flex flex-column gap-1">
        {{{ if poll.options.length }}}
        {{{ each poll.options }}}
        <!-- IMPORT poll/option-input.tpl -->
        {{{ end }}}
        {{{ end }}}
        </div>
        <button type="button" id="pollAddOption" class="btn btn-primary btn-sm btn-block mt-2">[[poll:options_add]]</button>
    </div>

    <hr>

    <div class="mb-3">
        <label class="form-label" for="pollInputAmount">[[poll:max_votes]]</label>
        <input type="number" name="maximumVotesPerUser" id="pollInputAmount" value="{poll.maximumVotesPerUser}" min="1" max="10" step="1" placeholder="[[poll:max_votes_placeholder]]" class="form-control">
        <p class="form-text">[[poll:info_choices]]</p>
    </div>

    <div class="form-check mb-3">
        <label class="form-check-label" for="pollDisallowVoteUpdate">[[poll:disallow_vote_update]]</label>
        <input class="form-check-input" type="checkbox" name="disallowVoteUpdate" id="pollDisallowVoteUpdate" {{{if poll.disallowVoteUpdate}}}checked{{{end}}}>
    </div>

    <div class="form-check mb-3">
        <label class="form-check-label" for="allowAnonVoting">[[poll:allow_anon_voting]]</label>
        <input class="form-check-input" type="checkbox" name="allowAnonVoting" id="allowAnonVoting" {{{if poll.allowAnonVoting}}}checked{{{end}}}>
    </div>

    <div class="mb-3">
        <label class="form-label" for="pollInputEnd">[[poll:auto_end_title]]</label>
        <div class="input-group date">
            <input id="pollInputEnd" placeholder="[[poll:auto_end_placeholder]]" name="end" class="form-control" value="{poll.end}" type="datetime-local">
        </div>
        <p class="form-text">[[poll:auto_end_help]]</p>
    </div>

    {{{ if isRedactor }}}
    <div class="alert alert-warning" role="alert">
        [[poll:warning.redactor]]
    </div>
    {{{ end }}}
</form>
