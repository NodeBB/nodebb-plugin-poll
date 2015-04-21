<div class="row">
    <div class="col-md-12">
        <h1>[[poll:poll]]</h1>
    </div>
</div>

<div class="row">
    <div class="col-xs-6 pull-left">
        <h2>[[poll:settings]]
            <small>[[poll:change_settings]]</small>
            <button id="reset" class="btn btn-warning btn-xs pull-right">[[poll:reset]]</button>
            <button id="save" class="btn btn-success btn-xs pull-right">[[poll:save]]</button>
        </h2>
        <hr>
        <form class="form" id="pollSettingsForm">
            <h3>[[poll:toggles]]</h3>
            <div class="form-group">
                <div class="checkbox">
                    <label>
                        <input type="checkbox" data-key="toggles.allowAnon"> [[poll:allow_guests]]
                    </label>
                </div>
            </div>
            <h3>[[poll:limits]]</h3>
            <div class="form-group">
                <label for="maxPollOptions">[[poll:max_options]]</label>
                <input type="number" class="form-control" id="maxPollOptions" placeholder="10" min="1" max="100" data-key="limits.maxOptions">
            </div>
            <h3>[[poll:defaults]]</h3>
            <div class="form-group">
                <label for="defaultsTitle">[[poll:default_title]]</label>
                <input type="text" class="form-control" id="defaultsTitle" placeholder="Poll" data-key="defaults.title">
            </div>
            <div class="form-group">
                <label for="defaultsMaxVotes">[[poll:max_votes]]</label>
                <input type="number" class="form-control" id="defaultsMaxVotes" placeholder="1" min="1" max="100" data-key="defaults.maxvotes">
                <p class="help-block">[[poll:info_choices]]</p>
            </div>
        </form>
    </div>
    <div class="col-xs-6 pull-right">
        <h2>[[poll:actions]]</h2>
        <hr>
    </div>
</div>

<script>
    require(['settings'], function (settings) {
        var wrapper = $('#pollSettingsForm');
        settings.sync('poll', wrapper);
        $('#save').click(function(event) {
            event.preventDefault();
            settings.persist('poll', wrapper, function(){
                socket.emit('admin.plugins.poll.sync');
            });
        });
        $('#reset').click(function(event) {
            event.preventDefault();
            bootbox.confirm('Are you sure you wish to reset the settings?', function(sure) {
                if (sure) {
                    socket.emit('admin.plugins.poll.getDefaults', null, function (err, data) {
                        settings.set('poll', data, wrapper, function(){
                            socket.emit('admin.plugins.poll.sync');
                        });
                    });
                }
            });
        });
    });
</script>