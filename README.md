# NodeBB Poll plugin

This NodeBB plugin will allow you to add polls to the first post of a topic with the following markup:

    [poll <settings>]
    - Poll option
    - Another option
    [/poll]

Supported settings:

    max="1" //Max number of votes per user. If larger than 1, a multiple choice poll will be created
    title="Poll title" //Poll title

## Todo

- Add the ability to add a poll by editing the first post of a topic (requires refresh after edit now)
- Add the ability to edit a poll
- Add the ability to remove a vote, and a setting to disable the removal of votes
- A lot of the frontend: properly display when a poll is deleted or has ended, able to delete a vote, edit a poll etc
- Overall improvement of the code
- A lot more...

If you're willing to help, please make any improvements you want and submit a PR.

## Installation

    npm install nodebb-plugin-poll
