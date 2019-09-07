<div class="poll-view" data-poll-id="{poll.info.pollId}">
    <div class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">{poll.settings.title}</h3>
            <div class="btn-group pull-right hidden">
                <a href="#" class="poll-button-edit">
                    <span class="fa fa-pencil"></span>
                </a>
            </div>
        </div>
        <div class="panel-body">
            <div class="poll-view-messages hidden"></div>
            <div class="poll-view-voting <!-- IF poll.hasVoted -->hidden<!-- ENDIF poll.hasVoted -->">
                <!-- IMPORT poll/view/voting.tpl -->
            </div>
            <div class="poll-view-results <!-- IF !poll.hasVoted -->hidden<!-- ENDIF !poll.hasVoted -->">
                <!-- IMPORT poll/view/results.tpl -->
            </div>

            <div class="poll-view-buttons">
                <button type="button" class="btn btn-primary poll-button-vote hidden">[[poll:vote]]</button>
                <button type="button" class="btn btn-default poll-button-vote-anonymous hidden">Vote anonymously</button>

                <button type="button" class="btn btn-primary poll-button-update-vote hidden">[[poll:update_vote]]</button>
                <button type="button" class="btn btn-danger poll-button-remove-vote hidden">[[poll:remove_vote]]</button>
                <button type="button" class="btn btn-link poll-button-results hidden">[[poll:to_results]]</button>
                <button type="button" class="btn btn-link poll-button-voting hidden">[[poll:to_voting]]</button>
            </div>
        </div>
    </div>
</div>