<h2>{voteCount} [[poll:vote_count]]</h2>
<!-- BEGIN votes -->
<a href="/user/{votes.userslug}">
    <!-- IF votes.picture -->
    <img class="poll-result-avatar" title="{votes.username}" src="{votes.picture}">
    <!-- ELSE -->
    <div class="poll-result-avatar user-icon" title="{votes.username}" style="background-color: {votes.icon:bgColor};">{votes.icon:text}</div>
    <!-- ENDIF votes.picture -->
</a>
<!-- END votes -->