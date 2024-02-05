<!-- BEGIN poll.options -->
<div class="poll-result" data-poll-option-id="{poll.options.id}">
    <div class="d-flex justify-content-between mb-1">
        <strong>{poll.options.title}</strong>
        <a class="poll-result-votecount small" href="#">
            <span>{poll.options.voteCount}</span> [[poll:votes]]
        </a>
    </div>
    <div class="progress">
        <div class="progress-bar poll-result-progressbar" role="progressbar" aria-valuenow="{poll.options.percentage}" aria-valuemin="0" aria-valuemax="100" style="width: {poll.options.percentage}%;">
            <span><span class="percent">{poll.options.percentage}</span>%</span>
        </div>
    </div>
</div>
<!-- END poll.options -->