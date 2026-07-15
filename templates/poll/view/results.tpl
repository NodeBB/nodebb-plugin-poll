{{{ each poll.options }}}
<div class="poll-result" data-poll-option-id="{poll.options.id}">
    <div class="d-flex justify-content-between mb-1">
        <strong>{poll.options.title}</strong>
        {{{ if config.loggedIn }}}
        <a class="poll-result-votecount small" href="#">
            <span>{{tx("poll:x-votes", poll.options.voteCount)}}</span>
        </a>
        {{{ else }}}
        <span class="poll-result-votecount small">
            <span>{{tx("poll:x-votes", poll.options.voteCount)}}</span>
        </span>
        {{{ end }}}
    </div>
    <div class="progress">
        <div class="progress-bar poll-result-progressbar" role="progressbar" aria-valuenow="{poll.options.percentage}" aria-valuemin="0" aria-valuemax="100" style="width: {poll.options.percentage}%;">
            <span><span class="percent">{poll.options.percentage}</span>%</span>
        </div>
    </div>
</div>
{{{ end }}}