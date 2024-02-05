<div class="acp-page-container">
	<div component="settings/main/header" class="row border-bottom py-2 m-0 sticky-top acp-page-main-header align-items-center">
        <div class="col-12 col-md-8 px-0 mb-1 mb-md-0">
            <h4 class="fw-bold tracking-tight mb-0">{title}</h4>
        </div>
        <div class="col-12 col-md-4 px-0 px-md-3 text-end">
            <button id="reset" class="btn btn-warning btn-sm fw-semibold ff-secondary text-center text-nowrap">[[poll:reset]]</button>
            <button id="save" class="btn btn-primary btn-sm fw-semibold ff-secondary text-center text-nowrap">[[admin/admin:save-changes]]</button>
        </div>
    </div>

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
            <form class="form poll-settings">
                <div class="card">
                    <div class="card-header">[[poll:poll]]</div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6>[[poll:toggles]]</h6>
                            <div class="mb-3">
                                <div class="form-check">
                                    <label class="form-check-label">[[poll:allow_guests]]</label>
                                    <input class="form-check-input" type="checkbox" data-key="toggles.allowAnon" data-trim="false">
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <h6>[[poll:limits]]</h6>
                            <div>
                                <label class="form-label" for="maxPollOptions">[[poll:max_options]]</label>
                                <input type="number" class="form-control" id="maxPollOptions" placeholder="10" min="1" max="100" data-key="limits.maxOptions">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">[[poll:defaults]]</div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label" for="defaultsTitle">[[poll:default_title]]</label>
                            <input type="text" class="form-control" id="defaultsTitle" placeholder="Poll" data-key="defaults.title">
                        </div>
                        <div>
                            <label class="form-label" for="defaultsMaxVotes">[[poll:max_votes]]</label>
                            <input type="number" class="form-control" id="defaultsMaxVotes" placeholder="1" min="1" max="100" data-key="defaults.maxvotes">
                            <p class="form-text">[[poll:info_choices]]</p>
                        </div>
                    </div>
                </div>
            </form>
		</div>

		<!-- IMPORT admin/partials/settings/toc.tpl -->
	</div>
</div>


