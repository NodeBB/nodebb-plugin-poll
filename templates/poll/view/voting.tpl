<form role="form" class="poll-voting-form">
    <!-- BEGIN poll.options -->
    <div class="poll-view-option {poll.optionType}" data-poll-option-id="{poll.options.id}">
        <label>
            <input type="{poll.optionType}" name="pollVoteSelection" value="{poll.options.id}">
            {poll.options.title}
        </label>
    </div>
    <!-- END poll.options -->
</form>

<!-- IF poll.settings.disallowVoteUpdate -->
<div class="alert alert-warning" role="alert">
    [[poll:vote_is_final]]
</div>
<!-- ENDIF poll.settings.disallowVoteUpdate -->
