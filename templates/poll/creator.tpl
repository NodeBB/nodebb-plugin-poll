<form class="form" id="pollCreator">
    <div id="pollErrorBox" class="alert alert-danger hidden"></div>

    <div class="form-group">
        <label for="pollInputTitle">[[poll:poll_title]]</label>
        <input type="text" name="settings[title]" id="pollInputTitle" value="{poll.settings.title}" placeholder="[[poll:enter_poll_title]]" class="form-control">
    </div>

    <div class="form-group">
        <label for="pollInputOptions">[[poll:options]]</label>
        <!-- IF poll.options.length -->
        <!-- BEGIN poll.options -->
        <input type="text" name="options[]" id="pollInputOptions" value="@value" class="form-control"/>
        <!-- END poll.options -->
        <!-- ELSE -->
        <input type="text" name="options[]" id="pollInputOptions" class="form-control"/>
        <!-- ENDIF poll.options.length -->
        <button type="button" id="pollAddOption" class="btn btn-primary btn-sm btn-block">Add option</button>
    </div>

    <hr>

    <div class="form-group">
        <label for="pollInputAmount">[[poll:max_votes]]</label>
        <input type="number" name="settings[maxvotes]" id="pollInputAmount" value="{poll.settings.maxvotes}" min="1" max="10" step="1" placeholder="[[poll:enter_amount]]" class="form-control">
    </div>

    <div class="form-group">
        <label for="pollInputEnd">[[poll:auto_end]]</label>

        <div class='input-group date' id='pollInputEnd'>
            <input type="text" name="settings[end]" value="{poll.settings.end}" placeholder="[[poll:date_placeholder]]" class="form-control" readonly>
            <span class="input-group-addon">
                <span class="fa fa-calendar"></span>
            </span>
        </div>
        <p class="help-block">[[poll:auto_end_help]]</p>
    </div>
</form>
