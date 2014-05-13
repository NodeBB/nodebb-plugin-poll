<div id="pollErrorBox" class="alert alert-danger hidden"></div>

<div class="form-group">
    <label for="pollInputTitle">Poll title</label>
    <input data-poll-setting="title" type="text" class="form-control" id="pollInputTitle" placeholder="Enter poll title">
</div>

<div class="form-group">
    <label for="pollInputOptions">Options</label>
    <textarea id="pollInputOptions" class="form-control" rows="5" placeholder="Place each option on a new line"></textarea>
</div>

<h3>Settings</h3>

<div class="form-group">
    <label for="pollInputAmount">Votes per user</label>
    <!-- TODO change this to defaults -->
    <input data-poll-setting="max" type="number" min="1" max="10" step="1" class="form-control" id="pollInputAmount" placeholder="Enter amount">
    <p class="help-block">A value greater than 1 creates a multiple choice poll.</p>
</div>

<div class="form-group">
    <label for="pollInputAmount">Automatically end poll</label>
    <input data-poll-setting="end" type="text" class="form-control" id="pollInputEnd" placeholder="Click to enter date and time">
    <p class="help-block">Leaving this empty will never end the poll.</p>
</div>

<div id="dtBox"></div>