<h2>{voteCount} [[poll:vote_count]]</h2>
<!-- BEGIN votes -->
<a href="{config.relative_path}/user/{votes.userslug}" class="poll-result-details">
    {buildAvatar(votes, "24px", true)}
</a>
<!-- END votes -->
<!-- IF privateVotes -->
<p>[[poll:votes_are_hidden]]</p>
<!-- ENDIF privateVotes -->
