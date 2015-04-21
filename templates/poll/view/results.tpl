<h3>[[poll:results]]</h3>
<!-- BEGIN options -->
<div class="poll-view-result" data-poll-result="{options.id}">
    <h4>{options.title} <small class="pull-right"><a class="poll-view-result-votecount" href="#">{options.votecount} [[poll:votes]]</a></small><!--<span class="pull-right badge poll-view-result-percentage">{options.percentage}%</span>--></h4>
    <div class="progress">
        <div class="progress-bar poll-view-result-progressbar" role="progressbar" aria-valuenow="{options.percentage}" aria-valuemin="0" aria-valuemax="100" style="width: {options.percentage}%;">
            <span class="poll-view-result-percentage">{options.percentage}%</span>
        </div>
    </div>
</div>
<!-- END options -->