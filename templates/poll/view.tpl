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
            <div class="poll-view-voting <!-- IF hasVoted -->hidden<!-- ENDIF hasVoted -->">
                <!-- IMPORT poll/view/voting.tpl -->
            </div>
            <div class="poll-view-results <!-- IF !hasVoted -->hidden<!-- ENDIF !hasVoted -->">
                <!-- IMPORT poll/view/results.tpl -->
            </div>
            <div class="poll-view-buttons">
                <!-- IF !hasVoted -->
                <button type="button" class="btn btn-primary poll-button-vote">[[poll:vote]]</button>
                <button type="button" class="btn btn-link poll-button-voting hidden">[[poll:to_voting]]</button>
                <button type="button" class="btn btn-link poll-button-results">[[poll:to_results]]</button>
                <!-- ENDIF !hasVoted -->
            </div>
        </div>
    </div>
</div>