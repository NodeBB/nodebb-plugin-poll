<form role="form" class="poll-voting-form mb-3 d-flex flex-column gap-3">
    {{{ each poll.options }}}
    <div class="poll-view-option {poll.optionType}" data-poll-option-id="{poll.options.id}">
        <div class="form-check">
            <input class="form-check-input" type="{poll.optionType}" name="pollVoteSelection" value="{poll.options.id}" id="poll-{poll.info.pollId}-option-id-{poll.options.id}">
            <label class="form-check-label" for="poll-{poll.info.pollId}-option-id-{poll.options.id}">{poll.options.title}</label>
        </div>
    </div>
    {{{ end }}}
</form>

{{{ if poll.info.disallowVoteUpdate }}}
<div class="alert alert-warning" role="alert">
    {{tx("poll:vote_is_final")}}
</div>
{{{ end }}}
