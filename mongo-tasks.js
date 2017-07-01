const R = require('ramda')
const Task = require('data.task')
const MongoClient = require('mongodb').MongoClient

const connectDb = db_url => 
	new Task((reject, resolve) =>  
		MongoClient.connect(db_url, (err, db) => 
			err ? reject(err) 
				: resolve(db) 
		) 
	)

const findIn = R.curry((db, collection, query) => 
	new Task((reject, resolve) => 
		db.collection(collection).find(query).toArray((err, res) => 
			err ? reject(err) : resolve(res)
		)
	)
)

const insertOne = R.curry((db, collection, doc) =>
	new Task((reject, resolve) => 
		db.collection(collection).insertOne(doc, (err, res) =>
			err ? reject({error: err, fn: 'mongo-tasks.insertOne', code:'db_insertOne',  doc}) : resolve(res)
		)
	)
)

const insertMany = R.curry((db, collection, docs_arr) => 
	new Task((reject, resolve) => 
		db.collection(collection).insertMany(docs_arr, (err, res) =>
			err ? reject(err) : resolve(res)
		)
	)
)




/*
* 	
* 	UPDATE TASKS
*
 */


/* 
*  updateMaker :: ErrorInfo 'fn_name' -> (update_obj -> { mongo_operated_obj ) ->  DB {} ->  'collection' -> UpdateParams {upsert, *} -> Query {} -> Update {} -> Task Error DBWrite
*  
*  Constructs an update Task:
*  		It first takes a function that helps configure the object to be updated, using Mongo's update operators (it may not use any, as in the updateOne function below). 
*  		Next it takes the usual arguments of the mongo db.collection.update method, but it does so in a way that favors the currying of this method, taking the "params" object before the query and update objects.
 */
const updateMaker = R.curry((error_fn_name, update_processing_fn, db, collection, params, query, update_obj) => 
 	new Task((reject, resolve) => 
 		db.collection(collection).update(query, update_processing_fn(update_obj), params, (err, res) =>
 			err ? reject({error: err, fn: 'mongo-tasks.' + error_fn_name, code: 'db_' + error_fn_name,  update_obj}) : resolve(res)
 		)
 	)
)

// updateOne ::  DB {} ->  'collection' -> UpdateParams {upsert, *} -> Query {} -> UpdateObj {} -> Task Error DBWrite
const updateOne = updateMaker('updateOne', obj => obj)

// updatePushOne ::  DB {} ->  'collection' -> UpdateParams {upsert, *} -> Query {} -> UpdateObj {} -> Task Error DBWrite
const updatePushOne = updateMaker('updatePushOne', update_obj => ({$push: update_obj}) )

// updatePushOneToSet ::  DB {} ->  'collection' -> UpdateParams {upsert, *} -> Query {} -> UpdateObj {} -> Task Error DBWrite
const updatePushOneToSet = updateMaker('updatePushOneToSet', update_obj => ({$addToSet: update_obj}) )

// updatePushMany ::  DB {} ->  'collection' -> UpdateParams {upsert, *} -> Query {} -> [UpdateObj] -> Task Error DBWrite
const updatePushMany = updateMaker( 'updatePushMany', update_obj_arr => ({
		$push: R.map(value => ({$each: value}), update_obj_arr)
	}) 
)

const addToSetObjFromArr = update_obj_arr => ({
		$addToSet: R.map(value => ({$each: value}), update_obj_arr)
	})
// updatePushManyToSet ::  DB {} ->  'collection' -> UpdateParams {upsert, *} -> Query {} -> [UpdateObj] -> Task Error DBWrite
const updatePushManyToSet = updateMaker('updatePushManyToSet', update_obj_arr =>  addToSetObjFromArr(update_obj_arr)
)


const deleteInOne = R.curry((db, collection, query) => 
	new Task((reject, resolve) =>
		db.collection(collection).deleteOne(query, (err, res) =>
			err ? reject({error: err, fn:'mongo-tasks.deleteInOne', code:'deleteOne'}) : resolve(res)
		)
	)
)


const lookup = R.curry((db, collection, joined_collection, related_fields, output_prop) => 
	new Task((reject, resolve) =>
		db.collection(collection).aggregate([{
			$lookup: {
				from: joined_collection,
				localField: related_fields[0],
				foreignField: related_fields[1],
				as: output_prop
			}
		}], (err, res) =>
			err ? reject({error: err, fn:'mongo-tasks.lookup', code:'join'}) : resolve(res)
		)
	)
)

const _uniqueIndxObjs = R.map(index => ({ key: { [index]: 1}, name: index, unique: true	}))

const setupUniqueFields = R.curry((db, collection, unique_indexes_arr) => 
	new Task((reject, resolve) =>
		db.collection(collection).createIndexes(
			_uniqueIndxObjs(unique_indexes_arr),
			(err, response) => err ? reject(err) : resolve(response)
	    )
	)
)

const init = R.curry(
	(db, collection, required_tasks) => {
		let tasks = {
				findIn,
				insertOne,
				insertMany,
				updateOne,
				updatePushOne,
				updatePushMany,
				updatePushOneToSet,
				updatePushManyToSet,
				deleteInOne
			}
		let applyTasks = R.map(task => task(db, collection))

		if (required_tasks.length === 0) {
			return applyTasks(tasks)
		} else if (required_tasks.length > 0) {
			return applyTasks(R.pickAll(required_tasks, tasks))
		}
	}
)

module.exports = {
	connectDb,
	init,
	findIn,
	insertOne,
	insertMany,
	updateOne,
	updatePushOne,
	updatePushMany,
	updatePushOneToSet,
	updatePushManyToSet,
	addToSetObjFromArr,
	deleteInOne,
	setupUniqueFields,
	lookup
}


