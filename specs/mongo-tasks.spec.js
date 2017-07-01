const expect = require("chai").expect;
const proxyquire = require('proxyquire');
const R = require('ramda');
const h = require('./mongo-tasks-test-helpers');
const database_name = 'mongo_tasks_TESTDB';
const url = `mongodb://localhost:27017/${database_name}`;
const seeded = [{user: 'number 1'}, {user: 'number 2'}, {user: 'number 3'}];

//testing
const connectDb = require('../mongo-tasks').connectDb;
const findIn = require('../mongo-tasks').findIn;
const insertOne = require('../mongo-tasks').insertOne;
const insertMany = require('../mongo-tasks').insertMany;
const updateOne = require('../mongo-tasks').updateOne;
const updatePushOne = require('../mongo-tasks').updatePushOne;
const updatePushMany = require('../mongo-tasks').updatePushMany;
const updatePushOneToSet = require('../mongo-tasks').updatePushOneToSet;
const updatePushManyToSet = require('../mongo-tasks').updatePushManyToSet;
const deleteInOne = require('../mongo-tasks').deleteInOne;
const lookup = require('../mongo-tasks').lookup;
const init = require('../mongo-tasks').init;
const setupUniqueFields = require('../mongo-tasks').setupUniqueFields;




//TODO cambiar todo para usar sólo una conexión
describe('MongDb Tasks Library', function() {
	this.timeout(5000);

	describe('Connection', () => {
		describe('connectDb :: String url -> Task db', () => {
			it('returns a database connection', (done) => {
				connectDb(url).fork(console.log, db => {
					expect(db.s.databaseName).to.equal(database_name);
					db.close();
					done();
				});
			});
		});
	});

	describe('After Connection', () => {
		let db;

		before((done) => { 
			connectDb(url).fork(console.log, database => {
				db = database;
				let omited_coll = '';
				h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'defaultCollection', seeded))
			});
		});

		after(done => {
			db.close();
			done();
		})

		describe('[findIn]', ()  => {
		   it('returns a query', (done) => {
		   		findIn(db, 'defaultCollection', {}).fork(e => done(e), results => {
		   			let users = R.map(results => results.user, results);
		   			expect(users).to.eql([ 'number 1', 'number 2', 'number 3' ]);
		   			expect(results.length).equal(3);
		   			done();
		   		});
		   });
		});

		describe('[insertOne]', ()  => {
			beforeEach((done) =>{ return h.dropAllCollectionsExcept2(db, 'insertErrorsCollection', done);	});
		   	
		   	it('inserta un objeto en la base de Datos', (done) => {
		   		insertOne(db, 'insertOneCollection', {user:'diego'}).fork(e => done(e), result =>{
		   			expect(result).to.have.deep.property('result.ok', 1);
		   			expect(result).to.have.deep.property('result.n', 1);
		   			expect(result).to.have.deep.property('insertedCount', 1);
		   			expect(result.ops[0]).to.have.deep.property('user', 'diego');
		   			done();
		   		});
		   	});

		   	describe('Errors', () => {
		   		before((done) => {
		   			db.collection('insertErrorsCollection').createIndex( { user_id: 1 }, { unique: true }, (err, res) => {
				   		insertOne(db, 'insertErrorsCollection', {user:'diego', user_id: 5}).fork(e => done(e), result =>done());
		   			});
		   		})
				after((done) =>{ return h.dropAllCollectionsExcept2(db, '', done);	});
			   	it('Returns an error when a duplicate unique_id is inserted', (done) => {
			   		insertOne(db, 'insertErrorsCollection', {user:'villasenor', user_id: 5}).fork(
			   			e => {
			   				expect(e.error.code).to.eql(11000);
			   				done();
			   			}, 
			   			result => done(result));
			   	});
		   	});
		});

		describe('[insertMany]', ()  => {
			beforeEach((done) =>{ return h.dropAllCollectionsExcept2(db, '', done);	});
		   	
		   	it('inserta múltiples objetos en la base de Datos', (done) => {
		   		insertMany(db, 'insertOneCollection', [{user:'diego'}, {user:'villasenor'}, {user:'de cortina'}]).fork(e => done(e), result =>{
		   			expect(result).to.have.deep.property('result.ok', 1);
		   			expect(result).to.have.deep.property('result.n', 3);
		   			expect(result).to.have.deep.property('insertedCount', 3);
		   			expect(result.ops[0]).to.have.deep.property('user', 'diego');
		   			expect(result.ops[1]).to.have.deep.property('user', 'villasenor');
		   			expect(result.ops[2]).to.have.deep.property('user', 'de cortina');
		   			done();
		   		});
		   	});

		   	describe('Errors', () => {
			   	it('Returns an error when a duplicate unique_id is inserted');
		   	});
		});

		describe('[updateOne]', function() {
			this.timeout(5000)
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'updateCollection', seeded))});

			it('updates an element in one collection', (done) => {
				updateOne(db, 'updateCollection', {upsert: false}, {user: 'number 1'}, {user: 'number 1', name: 'Diego'})
					.fork(e => console.log(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updateCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].name).equal('Diego')
				   			done();
					})
				});
			});
		});

		describe('[updatePushOne]', function() {
			this.timeout(5000)
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'updatePushOneCollection', [{user:'number 1'}, {user:'number 2'}]))});

			it('pushes an element to an array inside a document', (done) => {
				updatePushOne(db, 'updatePushOneCollection', {upsert: false}, {user: 'number 1'}, {'attachments.section':'thing'})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updatePushOneCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing']})
				   			done();
						})
				});
			});

			it('can push multiple elements to multiple arrays inside a document', (done) => {
				updatePushOne(db, 'updatePushOneCollection', {upsert: false}, {user: 'number 2'}, {'attachments.section':'thing', 'attachments.section2':'thing2'})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updatePushOneCollection', {user: 'number 2'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing'], section2: ['thing2']})
				   			done();
						})
				});
			});
		});

		describe('[updatePushMany]', function() {
			this.timeout(5000)
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'updateManyCollection',  [{user:'number 1'}, {user:'number 3'}]))});

			it('pushes an array of elements to an array inside a document', (done) => {
				updatePushMany(db, 'updateManyCollection', {upsert: false}, {user: 'number 1'}, {'attachments.section':['thing', 'stuff']})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updateManyCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing', 'stuff']})
				   			done();
					})
				});
			});

			it('can push multiple arrays of elements to multiple arrays inside a document', (done) => {
				updatePushMany(db, 'updateManyCollection', {upsert: false}, {user: 'number 3'}, {'attachments.section':['thing', 'stuff'], 'attachments.section2':['thing2', 'stuff2']})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updateManyCollection', {user: 'number 3'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing', 'stuff'], section2: ['thing2', 'stuff2']})
				   			done();
					})
				});
			});
		});

		describe('[updatePushOneToSet]', function() {
			this.timeout(5000)
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'updatePushOneToSetCollection', [{user:'number 1', attachments: {section: ['thing'], obj:[{this:'object'}]}}]))});

			it('pushes an element to an array only if it is not already in the array', (done) => {
				updatePushOneToSet(db, 'updatePushOneToSetCollection', {upsert: false}, {user: 'number 1'}, {'attachments.section':'thing'})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 0, n: 1 })
						findIn(db, 'updatePushOneToSetCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing'], obj:[{this:'object'}]})
				   			done();
						})
				});
			});

			it('works with objects too!', (done) => {
				updatePushOneToSet(db, 'updatePushOneToSetCollection', {upsert: false}, {user: 'number 1'}, {'attachments.obj':{this:'object'}})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 0, n: 1 })
						findIn(db, 'updatePushOneToSetCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing'], obj:[{this:'object'}]})
				   			done();
						})
				});
			});

			it('can push multiple elements to multiple arrays inside a document', (done) => {
				updatePushOneToSet(db, 'updatePushOneToSetCollection', {upsert: false}, {user: 'number 1'}, {'attachments.section':'thing', 'attachments.section2':'thing2' , 'attachments.obj':{this:'object2'}})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updatePushOneToSetCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing'], section2: ['thing2'], obj:[{this:'object'}, {this: 'object2'}]})
				   			done();
						})
				});
			});
		});

		describe('[updatePushManyToSet]', function() {
			this.timeout(5000)
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'updatePushManyToSetCollection', [{user:'number 1', attachments: {section: ['thing'], obj:[{this:'object'}]}}]))});

			it('pushes an element to an array only if it is not already in the array', (done) => {
				updatePushManyToSet(db, 'updatePushManyToSetCollection', {upsert: false}, {user: 'number 1'}, {'attachments.section':['thing', 'somethingelse']})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updatePushManyToSetCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing', 'somethingelse'], obj:[{this:'object'}]})
				   			done();
						})
				});
			});

			it('works with objects too!', (done) => {
				updatePushManyToSet(db, 'updatePushManyToSetCollection', {upsert: false}, {user: 'number 1'}, {'attachments.obj':[{this:'object'}, {this: 'other object'}]})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updatePushManyToSetCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing'], obj:[{this:'object'}, {this: 'other object'}]})
				   			done();
						})
				});
			});


			it('can push multiple elements to multiple arrays inside a document', (done) => {
				updatePushManyToSet(db, 'updatePushManyToSetCollection', {upsert: false}, {user: 'number 1'}, {'attachments.section':['thing', 'somethingelse'], 'attachments.section2':['thing2', 'somethingelse2']})
					.fork(e => done(e), result => {
			   			expect(result.result).to.deep.equal({ ok: 1, nModified: 1, n: 1 })
						findIn(db, 'updatePushManyToSetCollection', {user: 'number 1'}).fork(e => done(e), query => {
				   			expect(query[0].attachments).to.eql({section: ['thing', 'somethingelse'], section2: ['thing2', 'somethingelse2'], obj:[{this:'object'}]})
				   			done();
						})
				});
			});
		});



		describe('[deleteInOne]', ()  => {
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'deleteCollection', seeded))});

			it('deletes one element in one collection', (done) => {
				deleteInOne(db, 'deleteCollection', {user: 'number 1'})
					.fork(e => console.log(e), result => {
						expect(result.result).to.eql({ ok: 1, n: 1 });
						findIn(db, 'deleteCollection', {}).fork(e => done(e), query => {
				   			expect(query.map(el => el.user)).to.eql(['number 2', 'number 3'])
				   			done();
					})
				});
			});
		});

		describe('[lookup] performs a left outer join', ()  => {
			let subcategories = [
				{'_id': 1, parent_id: 1, label:{es: 'chunche', en: 'thing'},  slug:{es: 'chuche', en: 'thing'}},
				{'_id': 2, parent_id: 2, label:{es: 'cosa', en: 'stuff'},  slug:{es: 'cosa', en: 'stuff'}},
				{'_id': 3, parent_id: 1, label:{es: 'ente', en: 'entity'},  slug:{es: 'ente', en: 'entity'}}
			]
			
			let categories = [
				{_id: 1, label:{es: 'bonito', en: 'pretty'},  slug:{es: 'bonito', en: 'pretty'}},
				{_id: 2, label:{es: 'rebonito', en: 'very pretty'},  slug:{es: 'rebonito', en: 'very-pretty'}},
			]

			let joined_cats_in_subcats =  [
				{'_id': 1, parent_id: 1, label:{es: 'chunche', en: 'thing'},  slug:{es: 'chuche', en: 'thing'}, parent: [{'_id': 1, label:{es: 'bonito', en: 'pretty'},  slug:{es: 'bonito', en: 'pretty'}}] },
				{'_id': 2, parent_id: 2, label:{es: 'cosa', en: 'stuff'},  slug:{es: 'cosa', en: 'stuff'}, parent: [{'_id': 2, label:{es: 'rebonito', en: 'very pretty'},  slug:{es: 'rebonito', en: 'very-pretty'}}] },
				{'_id': 3, parent_id: 1, label:{es: 'ente', en: 'entity'},  slug:{es: 'ente', en: 'entity'}, parent: [{'_id': 1, label:{es: 'bonito', en: 'pretty'},  slug:{es: 'bonito', en: 'pretty'}}] }
			]

			let joined_subcats_in_cats =  [
				{
					_id: 1, label:{es: 'bonito', en: 'pretty'},  slug:{es: 'bonito', en: 'pretty'}, 
					children: [
						{'_id': 1, parent_id: 1, label:{es: 'chunche', en: 'thing'},  slug:{es: 'chuche', en: 'thing'}},
						{'_id': 3, parent_id: 1, label:{es: 'ente', en: 'entity'},  slug:{es: 'ente', en: 'entity'}}
					]
				},
				{
					_id: 2, label:{es: 'rebonito', en: 'very pretty'},  slug:{es: 'rebonito', en: 'very-pretty'},
					children: [{'_id': 2, parent_id: 2, label:{es: 'cosa', en: 'stuff'},  slug:{es: 'cosa', en: 'stuff'}}]
				},
			]


			beforeEach((done) => { 
				return h.dropAllCollectionsExcept2(
					db, 
					'', 
					h.seedDb(//nests both seeds
						db,
						h.seedDb(//seed 2
							db,
							done, 
							'categoriesCollection', 
							categories
						), 
						'subcategoriesCollection', 
						subcategories
					)
				)
			});

			it('joins one collection with another [categories in subcategories]', (done) => {
				lookup(db, 'subcategoriesCollection', 'categoriesCollection', ['parent_id','_id'], 'parent')
					.fork(e => console.log(e), result => {
						expect(result).to.eql(joined_cats_in_subcats)
						done()
					})
			});

			it('joins one collection with another [subcategories in categories]', (done) => {
				lookup(db, 'categoriesCollection', 'subcategoriesCollection',  ['_id', 'parent_id'], 'children')
					.fork(e => console.log(e), result => {
						expect(result).to.eql(joined_subcats_in_cats)
						done()
					})
			});
		});

		describe('[init]', ()  => {
			beforeEach((done) => { return h.dropAllCollectionsExcept2(db, '', h.seedDb(db, done, 'initCollection', seeded))});
			it('initializes all tasks, and returns them in an object, if the last parameter is an empty array', () => {
				let tasks  = init(db, 'initCollection', [])
				expect(tasks).to.have.keys(['findIn', 'insertOne', 'insertMany', 'updateOne', 'updatePushOne', 'updatePushMany', 'updatePushOneToSet', 'updatePushManyToSet', 'deleteInOne' ])
			});

			it('returns only the required tasks', () => {
				let tasks  = init(db, 'initCollection', ['findIn', 'insertOne'])
				expect(tasks).to.have.all.keys(['findIn', 'insertOne'])
			});
			it('is curried', () => {
				let tasks  = init(db)
				let tasks_full  = tasks( 'initCollection', ['findIn', 'insertOne'])
				expect(tasks_full).to.have.all.keys(['findIn', 'insertOne'])
			});
			it('prepares the tasks to be able to deal with the given collection', function (done)  {
				let tasks  = init(db, 'initCollection', [])
				tasks.findIn({}).fork(console.log, s => {
					expect(s).to.eql(seeded)
					done()
				})
			});
		});

		describe('[setupUniqueFields]', ()  => {
			it('creates unique id fileds for one collection', function(done) {
				this.timeout(5000)
				setupUniqueFields(db, 'uniqueIdsCollection', ['username', 'email'])
					.fork(e => console.log(e), result => {
						expect(result).to.eql({ createdCollectionAutomatically: true,
											  numIndexesBefore: 1,
											  numIndexesAfter: 3,
											  ok: 1 })
			   			done();
				})
			});
		});
	});
});
