<div class="row">
    <div class="col-md-12">
        <h1>Poll</h1>
    </div>
</div>

<div class="row">
    <div class="col-xs-6 pull-left">
        <h2>Settings
            <small>change settings</small>
            <button id="reset" class="btn btn-warning btn-xs pull-right">Reset</button>
            <button id="save" class="btn btn-success btn-xs pull-right">Save</button>
        </h2>
        <hr>
        <form class="form" id="pollSettingsForm">
            <h3>Toggles</h3>
            <div class="form-group">
                <div class="checkbox">
                    <label>
                        <input type="checkbox" data-key="toggles.allowAnon"> Allow guests to view poll results
                    </label>
                </div>
            </div>
            <h3>Limits</h3>
            <div class="form-group">
                <label for="maxPollOptions">Maximum number of options per poll</label>
                <input type="number" class="form-control" id="maxPollOptions" placeholder="10" min="1" max="100" data-key="limits.maxOptions">
            </div>
        </form>
    </div>
    <div class="col-xs-6 pull-right">
        <h3>Actions
            <small>execute admin actions</small>
        </h3>
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