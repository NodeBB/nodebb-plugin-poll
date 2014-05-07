<div id="pollErrorBox" class="alert alert-danger hidden"></div>

<div class="form-group">
    <label for="pollInputTitle">Poll title</label>
    <input type="text" class="form-control" id="pollInputTitle" placeholder="Enter poll title">
</div>

<div class="form-group">
    <label for="pollInputOptions">Options</label>
    <textarea id="pollInputOptions" class="form-control" rows="5" placeholder="Place each option on a new line"></textarea>
</div>

<div class="form-group">
    <label for="pollInputAmount">Votes per user</label>
    <input type="number" min="1" max="10" step="1" value="1" class="form-control" id="pollInputAmount" placeholder="Enter amount">
    <p class="help-block">A value greater than 1 creates a multiple choice poll.</p>
</div>