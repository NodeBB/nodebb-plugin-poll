<div class="poll-view mb-3" data-poll-id="{poll.info.pollId}">
    <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">{poll.settings.title}</h5>

            <a href="#" class="btn btn-sm btn-light border poll-button-edit hidden">
                <span class="fa fa-pencil"></span>
            </a>
        </div>
        <div class="card-body">
            <div class="poll-view-messages hidden"></div>
            <div class="poll-view-voting <!-- IF poll.hasVoted -->hidden<!-- ENDIF poll.hasVoted -->">
                <!-- IMPORT poll/view/voting.tpl -->
            </div>
            <div class="poll-view-results d-flex flex-column gap-3 mb-3 <!-- IF !poll.hasVoted -->hidden<!-- ENDIF !poll.hasVoted -->">
                <!-- IMPORT poll/view/results.tpl -->
                <div class="text-end text-sm text-secondary poll-result-total-votecount">[[poll:total-votes-x, {poll.info.voteCount}]]</div>
            </div>

            <div class="poll-view-buttons">
                <button type="button" class="btn btn-primary poll-button-vote hidden">[[poll:vote]]</button>
                <button type="button" class="btn btn-primary poll-button-update-vote hidden">[[poll:update_vote]]</button>
                <button type="button" class="btn btn-danger poll-button-remove-vote hidden">[[poll:remove_vote]]</button>
                <button type="button" class="btn btn-link poll-button-results hidden">[[poll:to_results]]</button>
                <button type="button" class="btn btn-link poll-button-voting hidden">[[poll:to_voting]]</button>
            </div>
        </div>
    </div>
</div>