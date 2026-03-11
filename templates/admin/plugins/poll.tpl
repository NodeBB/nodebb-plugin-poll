<div class="acp-page-container">
	<div component="settings/main/header" class="row border-bottom py-2 m-0 sticky-top acp-page-main-header align-items-center">
		<div class="col-12 col-md-8 px-0 mb-1 mb-md-0">
			<h4 class="fw-bold tracking-tight mb-0">{title}</h4>
		</div>
		<div class="col-12 col-md-4 px-0 px-md-3 text-end">
			<button id="save" class="btn btn-primary btn-sm fw-semibold ff-secondary text-center text-nowrap">[[admin/admin:save-changes]]</button>
		</div>
	</div>

	<div class="row m-0">
		<div class="col-12 col-lg-9">
			<div class="table-responsive">
				<table id="poll-table" class="table">
					<thead>
						<tr class="text-sm">
							<th>ID</th>
							<th class="text-nowrap">[[poll:poll_title]]</th>
							<th class="text-nowrap">[[poll:created-time]]</th>
							<th class="text-nowrap">[[poll:end-time]]</th>
							<th class="text-end text-nowrap text-capitalize">[[poll:votes]]</th>
						</tr>
					</thead>
					<tbody class="text-xs text-tabular">
					{{{ each polls }}}
					<tr class="align-middle">
						<td>{./pollId}</td>
						<td><a href="{config.relative_path}/post/{./pid}">{./title}</a></td>
						<td class="text-nowrap"><span class="timeago" title="{./timestampISO}"></span></td>
						<td class="text-nowrap">
							{{{ if ./end }}}
							<span class="timeago" title="{./endISO}"></span>
							{{{ else }}}
							-
							{{{ end }}}
						</td>
						<td class="text-end">
							{./voteCount}
						</td>
					</tr>
					{{{ end }}}
					</tbody>
				</table>
			</div>
			<!-- IMPORT admin/partials/paginator.tpl -->
		</div>
		<div id="spy-container" class="col-12 col-lg-3" tabindex="0">
			<form class="form poll-settings">
				<div class="form-check mb-3">
					<label class="form-check-label" for="allowGuestsToViewResults">[[poll:allow_guests]]</label>
					<input class="form-check-input" type="checkbox" id="allowGuestsToViewResults" name="allowGuestsToViewResults">
				</div>

				<div class="mb-3">
					<label class="form-label" for="maxOptions">[[poll:max_options]]</label>
					<input type="number" class="form-control" id="maxOptions" placeholder="10" min="1" max="100" name="maxOptions">
				</div>

				<div class="mb-3">
					<label class="form-label" for="defaultTitle">[[poll:default_title]]</label>
					<input type="text" class="form-control" id="defaultTitle" placeholder="Poll" name="defaultTitle">
				</div>
				<div>
					<label class="form-label" for="maximumVotesPerUser">[[poll:max_votes]]</label>
					<input type="number" class="form-control" id="maximumVotesPerUser" placeholder="1" min="1" max="100" name="maximumVotesPerUser">
					<p class="form-text">[[poll:info_choices]]</p>
				</div>
			</form>
		</div>
	</div>
</div>


