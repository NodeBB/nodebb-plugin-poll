<div class="topic-poll-modal">
	{{{ if !post.polls.length }}}
	<div class="alert alert-info">[[poll:no-polls]]</div>
	{{{ end }}}
	{{{ each post.polls }}}
	<div component="post/poll/item" data-poll-id="{./pollId}" class="d-flex align-items-center justify-content-between mb-3">
		<div class="d-flex align-items-center gap-1">
			<a href="#" component="sort/handle" class="btn btn-light btn-sm align-self-start" style="cursor:grab;"><i class="fa fa-arrows-up-down text-muted"></i></a>
			<div class="text-nowrap flex-grow-1">{./title}</div>
		</div>

		<div class="d-flex align-items-center gap-1">
			<button class="btn btn-ghost btn-sm text-nowrap" data-action="edit" data-poll-id="{./pollId}"><i class="fa fa-pencil text-primary"></i></button>
			<button class="btn btn-ghost btn-sm text-nowrap" data-action="remove" data-poll-id="{./pollId}"><i class="fa fa-times text-danger"></i></button>
		</div>
	</div>
	{{{ end }}}
</div>
