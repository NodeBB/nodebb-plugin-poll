<div id="pollErrorBox" class="alert alert-danger hidden"></div>

<div class="form-group">
    <label for="pollInputTitle">[[poll:poll_title]]</label>
    <input data-poll-setting="title" type="text" class="form-control" id="pollInputTitle" placeholder="[[poll:enter_poll_title]]">
</div>

<div class="form-group">
    <label for="pollInputOptions">[[poll:options]]</label>
    <textarea id="pollInputOptions" class="form-control" rows="5" placeholder="[[poll:options_placeholder]]"></textarea>
</div>

<h3>[[poll:settings]]</h3>

<div class="form-group">
    <label for="pollInputAmount">[[poll:max_votes]]</label>
    <!-- TODO change this to defaults -->
    <input data-poll-setting="max" type="number" min="1" max="10" step="1" class="form-control" id="pollInputAmount" placeholder="[[poll:enter_amount]]">
    <p class="help-block">[[poll:info_choices]]</p>
</div>

<div class="form-group">
    <label for="pollInputAmount">[[poll:auto_end]]</label>
    <input data-poll-setting="end" type="text" class="form-control" id="pollInputEnd" placeholder="[[poll:date_placeholder]]">
    <p class="help-block">[[poll:auto_end_help]]</p>
</div>

<div id="dtBox"></div>