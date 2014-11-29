var path = require('path');
var Promise = require('promise');
var PouchDB = require('pouchdb');

var db = new PouchDB('https://skimdb.npmjs.com/registry');
var lastSequenceFile = path.resolve(__dirname, process.env.LAST_SEQUENCE_FILE);
var replicationStore = require('./replication-store')(lastSequenceFile);

// no limit by default: takes ages
// strategy: one time replication: 100 limit
// strategy: continuous replication 1 limit

// deleted: true sur changement, supprimer d'algolia

listenForChanges({
  since: replicationStore.get(),
  limit: parseFloat(process.env.CHANGES_LIMIT)
})
.catch(function(err) {
  console.error(err);
});

function listenForChanges(opts) {
  var last_seq;

  return db
    .changes({
      since: opts.since,
      limit: opts.limit,
      live: true,
      include_docs: true
    })
    .then(function (changes) {
      last_seq = changes.last_seq;

      console.log('lastseq ' + last_seq);
      var doAll = changes.results.map(doSometingAsync);

      return Promise.all(doAll);
    })
    .then(function saveSequence(res) {
      if (process.env.DRY_MODE !== 'yes') {
        replicationStore.set(last_seq);
      }

      console.log('done ' + res.length);

      return listenForChanges({
        since: last_seq,
        limit: opts.limit
      });
    });
}

function doSometingAsync(change) {
  return new Promise(function (resolve/*, reject*/) {
    console.log(change);
    setTimeout(resolve, 500, true);
  });
}
