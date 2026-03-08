
post:100 {
	...
	pollIds: ["200", "201", ...]
}

poll:200 {
	"_key" : "poll:200",
	"deleted" : 0,
	"end" : 0, // or unix timestamp when voting will close
	"pid" : 100,
	"pollId" : 200,
	"timestamp" : 1772893625284,
	"uid" : 1,
	"options": [
		{ id: "300", title: "option 1" }, { id: "301", title: "option 2" }, { id: "302", title: "option 3" }
	]
}

poll:123:voters // uids of voters zset

poll:123:options:300:votes { //zset of uids who voted for this option
	score: "<timestamp>", value: "1"
}