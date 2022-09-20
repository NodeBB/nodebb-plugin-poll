<div class="row">
    <div class="col-lg-9">
        <form class="form poll-settings">
            <div class="card">
                <div class="card-header">[[poll:poll]]</div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <h6>[[poll:toggles]]</h6>
                            <div class="mb-3">
                                <div class="form-check">
                                    <label class="form-check-label">[[poll:allow_guests]]</label>
                                    <input class="form-check-input" type="checkbox" data-key="toggles.allowAnon" data-trim="false">
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <h6>[[poll:limits]]</h6>
                            <div>
                                <label class="form-label" for="maxPollOptions">[[poll:max_options]]</label>
                                <input type="number" class="form-control" id="maxPollOptions" placeholder="10" min="1" max="100" data-key="limits.maxOptions">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">[[poll:defaults]]</div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-6">
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
                </div>
            </div>
        </form>
    </div>

    <div class="col-lg-3">
        <div class="card">
            <div class="card-header">[[poll:settings]]</div>
            <div class="card-body">
                <button id="save" class="btn btn-primary btn-block">[[poll:save]]</button>
                <button id="reset" class="btn btn-warning btn-block">[[poll:reset]]</button>
            </div>
        </div>
    </div>
</div>