<div component="post/poll/option/item" data-option-id="{./id}" class="bg-body d-flex align-items-center justify-content-between gap-2 p-1 rounded-1">
	<a href="#" component="sort/handle" class="btn btn-ghost btn-sm" style="cursor:grab;"><i class="fa fa-arrows-up-down text-muted"></i></a>
	<input type="text" name="options" id="pollInputOptions" value="{escape(./title)}" class="form-control"/>
	<input type="hidden" name="id" value="{./id}"/>
	<button class="btn btn-ghost btn-sm" data-action="remove-option" data-option-id="{./id}"><i class="fa fa-trash text-danger"></i></button>
</div>