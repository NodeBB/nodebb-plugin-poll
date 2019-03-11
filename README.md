# NodeBB Poll plugin

This NodeBB plugin will allow you to add polls to the first post of a topic with the following markup:

    [poll <settings>]
    - Poll option
    - Another option
    [/poll]

Currently supported settings:

    maxvotes="1" //Max number of votes per user. If larger than 1, a multiple choice poll will be created
    disallowVoteUpdate="0" //if set, users won't be able to update/remove their vote
    title="Poll title" //Poll title

There's also a helpful modal available that will allow you to easily create a poll:
![](https://i.imgur.com/2fPnWLb.png)

## Todo

- Add the ability to edit a poll
- Anonymous voting
- A lot more...

If you're willing to help, please make any improvements you want and submit a PR.

## Installation

Either through the NodeBB ACP or:

    npm install nodebb-plugin-poll
