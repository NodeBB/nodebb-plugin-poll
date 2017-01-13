<div class="row">
    <div class="col-lg-9">
        <form class="form poll-settings">
            <div class="panel panel-default">
                <div class="panel-heading">[[poll:poll]]</div>
                <div class="panel-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <strong>[[poll:toggles]]</strong>
                            <div class="form-group">
                                <div class="checkbox">
                                    <label>
                                        <input type="checkbox" data-key="toggles.allowAnon" data-trim="false"> [[poll:allow_guests]]
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <strong>[[poll:limits]]</strong>
                            <div class="form-group">
                                <label for="maxPollOptions">[[poll:max_options]]</label>
                                <input type="number" class="form-control" id="maxPollOptions" placeholder="10" min="1" max="100" data-key="limits.maxOptions">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="panel panel-default">
                <div class="panel-heading">[[poll:defaults]]</div>
                <div class="panel-body">
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="form-group">
                                <label for="defaultsTitle">[[poll:default_title]]</label>
                                <input type="text" class="form-control" id="defaultsTitle" placeholder="Poll" data-key="defaults.title">
                            </div>
                            <div class="form-group">
                                <label for="defaultsMaxVotes">[[poll:max_votes]]</label>
                                <input type="number" class="form-control" id="defaultsMaxVotes" placeholder="1" min="1" max="100" data-key="defaults.maxvotes">
                                <p class="help-block">[[poll:info_choices]]</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>

    <div class="col-lg-3">
        <div class="panel panel-default">
            <div class="panel-heading">[[poll:settings]]</div>
            <div class="panel-body">
                <button id="save" class="btn btn-primary btn-block">[[poll:save]]</button>
                <button id="reset" class="btn btn-warning btn-block">[[poll:reset]]</button>
            </div>
        </div>
    </div>
</div>