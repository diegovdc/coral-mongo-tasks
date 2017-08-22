# coral-mongo-tasks

`coral-mongo-tasks` is a library that simply takes a few of the most used functions from the `mongodb` module and wraps them inside the `Task` monad (from `folktale/data.task`).
It also curries the functions and optimizes the order of their arguments.

The main aim is to allow for code reuse (or new function creation) via currying and to facilitate the composition of other functions which would make use of the ones provided by this library (using, for example, Ramda's `composeK`).

This is a low level module. For a higher level functionality you may want to check out `coral-mongo-cruds` and `coral-mongo-attachments`.

If you do not know anything about Tasks, you should know that they are like Promises but lazy.  This links might help you understand them better.

Folktale's Data.Task documentation: http://folktalegithubio.readthedocs.io/en/latest/api/data/task/

Tasks Tutorial by Brian Lonsdorf: https://egghead.io/lessons/javascript-using-task-for-asynchronous-actions

Please note that this is just a thin wrapper, so it is better if you already know a bit about the `mongodb` module API.

## Installation
`npm install coral-mongo-tasks -S`

## Running tests
You should have `mongodb` installed globally.
On one terminal window start Mongo Db: `mongod`

On another window: `npm run test`

If you want to watch the tests in order to make changes or play around: `gulp`

## Sample Usage
```
const {findIn} = require('../mongo-tasks');
const {db} = require('./my-db-location');

//to get all documents from MyCollection
findIn(db, 'MyCollection', {}).fork(
	error => {
		//do something in case of error
	},
	results => {
		//do something in case of success
	}
);
```

## API

This section is a work in progress. At the moment not all functions are described here. If you do not find what you need, it is recommended that you take a look at the source (and at the tests for usage).

### connectDb :: DBUrl -> Database
```
connectDb(`mongodb://localhost:27017/mydatabase`).fork(
	error => {
		//do something in case of error
	},
	db => {
		//do something in case of success
	}
);
```

### findIn :: Database -> CollectionName -> Query -> Task Error DbFind
```
findIn(db, 'MyCollection', {}).fork(
	error => {
		//do something in case of error
	},
	results => {
		//do something in case of success
	}
);
```

### insertOne :: Database -> CollectionName -> Document -> Task Error DbWrite
```
insertOne(db, 'Users', {user:'someone'}).fork(
	error => {
		//do something in case of error
	},
	mongo_results_obj => {
		//do something in case of success
	}
);
```

### insertMany :: Database -> CollectionName -> [Document] -> Task Error DbWrite
```
insertMany(db, 'Users', [{user:'someone'}, {user:'someone else'}]).fork(
	error => {
		//do something in case of error
	},
	mongo_results_obj => {
		//do something in case of success
	}
);
```

### updateOne :: Database ->  CollectionName -> UpdateParams -> Query -> Document -> Task Error DBWrite

```
updateOne(db, 'updateCollection', {upsert: false}, {user: 'someone'}, {user: 'someone', nickname: 'Pepito'}).fork(
	error => {
		//do something in case of error
	},
	mongo_results_obj => {
		//do something in case of success
	}
);
```

### deleteInOne :: Database ->  CollectionName -> Query -> Task Error DBWrite

```
deleteInOne(db, 'Users', {user: 'someone'}).fork(
	error => {
		//do something in case of error
	},
	mongo_results_obj => {
		//do something in case of success
	}
);
```
