<div class="d-flex flex-wrap gap-2">
    {{{ each votes }}}
    <a href="{config.relative_path}/user/{votes.userslug}" class="poll-result-details">
        {buildAvatar(votes, "24px", true)}
    </a>
    {{{ end }}}
</div>
