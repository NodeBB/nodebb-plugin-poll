<h3>Results</h3>
<!-- BEGIN options -->
<div class="poll-view-result" id="pollResult{options.id}">
    <strong>{options.title}</strong><span class="pull-right poll-view-result-percentage">{options.percentage}%</span>
    <div class="progress">
        <div class="progress-bar poll-view-result-progressbar" role="progressbar" aria-valuenow="{options.percentage}" aria-valuemin="0" aria-valuemax="100" style="width: {options.percentage}%; content:'{options.percentage}'">
            <span class="sr-only poll-view-result-percentage">{options.percentage}%</span>
        </div>
    </div>
</div>
<!-- END options -->