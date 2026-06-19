<div class="poll-view mb-3" data-poll-id="{poll.info.pollId}">
    <div class="card shadow-sm border-0">
        <div class="card-header border-0 d-flex justify-content-between align-items-center flex-wrap">
            <h5 class="card-title mb-0 {{{ if poll.isWidget }}}fs-6{{{ end }}}">
                {{{ if poll.isWidget }}}
                <a class="text-reset text-break" href="{config.relative_path}/post/{poll.info.pid}">{poll.info.title}</a>
                {{{ else }}}
                {poll.info.title}
                {{{ end }}}
            </h5>
            {{{ if (isAdmin && !poll.isWidget) }}}
            <span class="text-sm text-secondary">[[poll:poll-id-x, {poll.info.pollId}]]</span>
            {{{ end }}}
        </div>
        <div class="card-body">
            <div class="poll-view-messages hidden"></div>
            <div class="poll-view-voting {{{ if poll.hasVoted }}}hidden{{{ end }}}">
                <!-- IMPORT poll/view/voting.tpl -->
            </div>
            <div class="poll-view-results d-flex flex-column gap-3 mb-3 {{{ if !poll.hasVoted }}}hidden{{{ end }}}">
                <!-- IMPORT poll/view/results.tpl -->
                <div class="text-end text-sm text-secondary poll-result-total-votecount">[[poll:total-votes-x, {poll.info.voteCount}]]</div>
            </div>

            <div class="poll-view-buttons">
                <button type="button" class="btn btn-sm btn-primary poll-button-vote hidden">[[poll:vote]]</button>
                <button type="button" class="btn btn-sm btn-primary poll-button-vote-anon hidden">[[poll:vote_anonymously]]</button>
                <button type="button" class="btn btn-sm btn-primary poll-button-update-vote hidden">[[poll:update_vote]]</button>
                <button type="button" class="btn btn-sm btn-danger poll-button-remove-vote hidden">[[poll:remove_vote]]</button>
                <button type="button" class="btn btn-sm btn-link poll-button-results hidden">[[poll:to_results]]</button>
                <button type="button" class="btn btn-sm btn-link poll-button-voting hidden">[[poll:to_voting]]</button>
            </div>
        </div>
    </div>
</div>