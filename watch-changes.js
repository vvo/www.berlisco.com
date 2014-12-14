// this file is used to watch changes to the npm registry and save
// the changed document back to algolia

var HttpsAgent = require('agentkeepalive').HttpsAgent;
var path = require('path');
var PouchDB = require('pouchdb');

var debug = require('debug')('npmfind:watch-changes');
var keepaliveAgent = new HttpsAgent();

var replicationStore = require('./replication-store')(
  path.resolve(__dirname, process.env.LAST_SEQUENCE_FILE)
);
var normalizePackage = require('./normalize-package');
var saveToAlgolia = require('./save-to-algolia');

var db = new PouchDB(process.env.NPM_REGISTRY_COUCHDB_ENDPOINT, {
  ajax: {
    agent: keepaliveAgent
  }
});

var last_seq = parseFloat(replicationStore.get());

showDbInfos()
  .then(listen)
  .catch(errorOccured);

function showDbInfos() {
  return db
    .info()
    .then(show);

  function show(info) {
    debug('Database %s at, %supdate_seq is `%d`', info.db_name, info.host, info.update_seq);
  }
}

function listen() {
  debug('Starting listen for changes at sequence `%d`', last_seq);

  return listenForChanges({
    since: last_seq
  });
}

function listenForChanges(opts) {
  return db
    .changes({
      since: opts.since,
      // We ask for only one change at a time,
      // so that we are always up to date.
      // Asking for 10 changes will WAIT for 10 changes
      limit: 1,
      live: true,
      include_docs: true
    })
    .then(handleChangeResponse)
    .then(saveLastSequence)
    .then(nextLoop);

    function handleChangeResponse(res) {
      var pkg = normalizePackage(res.results.pop().doc);
      return saveToAlgolia(pkg).then(returnLastSeq);

      function returnLastSeq() {
        return res.last_seq;
      }
    }

    function saveLastSequence(last_seq) {
      debug('last_seq was %d', last_seq);

      if (process.env.DRY_MODE !== 'yes') {
        replicationStore.set(last_seq);
      }

      return last_seq;
    }

    function nextLoop(last_seq) {
      return listenForChanges({
        since: last_seq
      });
    }
}

function errorOccured(err) {
  setTimeout(function() {
    throw err;
  }, 0);
}
