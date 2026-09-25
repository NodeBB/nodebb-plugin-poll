# NodeBB Poll plugin

This NodeBB plugin will allow you to add polls to posts.

There's helpful modal available that will allow you to easily create a poll:

![](https://i.imgur.com/2fPnWLb.png)

If you're willing to help, please make any improvements you want and submit a PR.

## Features

### Creating and editing polls

- Create polls from the composer (topic posts and replies) via the poll button in the formatting bar; multiple polls per post are supported
- Edit polls in the composer: change the title, add/remove options, adjust the end time and per-poll settings
- Poll creation is gated by the `poll:create` category privilege
- Polls follow their post's lifecycle — deleting a post soft-deletes its polls, restoring it restores them

### Per-poll options

- **Title** for the poll
- **Options** — up to the site-wide maximum (default 10)
- **Maximum votes per user** — `1` for single-choice (radio buttons), higher for multi-choice (checkboxes)
- **Optional end date/time** — the poll closes automatically when reached; no more voting after that
- **Allow anonymous voting** — voters can opt to hide their identity; anonymous voters are masked in the per-option voter lists for everyone except privileged users
- **Disallow vote updates** — lock the poll so votes can't be changed once cast

### Voting

- Logged-in users only (guests can view results if enabled in the ACP)
- Cast, change, and remove votes (subject to the per-poll settings above)
- Live results — vote changes are pushed to viewers in real time
- Per-option voter lists with percentages

### Site-wide settings (ACP)

- Default poll title
- Maximum number of options per poll
- Default maximum votes per user
- Allow guests to view results

## Federation

Polls federate across the fediverse as ActivityPub `Question` objects per [FEP-9967](https://codeberg.org/fediverse/fep/src/branch/main/fep/9967/fep-9967.md):

- **Inbound:** remote `Question` posts are ingested as polls and displayed with their current results. Local users can vote on remote polls, and each vote is federated back to the poll's author.
- **Outbound:** local polls are published as `Question` objects (single-choice as `oneOf`, multi-choice as `anyOf`), and votes received from remote actors are applied to the local poll's results.

Limitations:

- Only the **first** poll on a post is federated (FEP-9967 models one `Question` per poll); multiple polls per post are not supported.
- **Anonymous votes are not federated**, since FEP-9967 votes are attributed to the voter's actor.
- Votes on **remote** polls can be changed or removed (federated as `Create`/`Delete` per FEP-9967), but not all servers support this — e.g. some ignore `Delete` of a vote — so the change may not be reflected on the remote poll.

## Installation

Either through the NodeBB ACP or:

    npm install nodebb-plugin-poll
