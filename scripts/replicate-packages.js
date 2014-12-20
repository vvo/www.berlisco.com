// This file should be used as a oneshot solution to replicate all the existing npm
// packages to algolia. Starting from `process.env.REPLICATE_LAST_PACKAGE_STORE` last line

var HttpsAgent = require('agentkeepalive').HttpsAgent;
var path = require('path');
var Promise = require('promise');
var PouchDB = require('pouchdb');

var debug = require('debug')('berlisco:replicate-packages');
var keepaliveAgent = new HttpsAgent();

var replicationStore = require('../replication-store')(
  path.resolve(__dirname, '..', process.env.REPLICATE_LAST_PACKAGE_STORE)
);
var normalizePackage = require('../normalize-package');
var saveToAlgolia = require('../save-to-algolia');

var db = new PouchDB(process.env.NPM_REGISTRY_COUCHDB_ENDPOINT, {
  ajax: {
    agent: keepaliveAgent
  }
});
var firstOffset;
var startKey = replicationStore.get();

showDbInfos()
  .then(replicate)
  .then(end)
  .catch(errorOccured);

function showDbInfos() {
  return db
    .info()
    .then(show);

  function show(info) {
    debug('Database %s at %s contains `%d` packages', info.db_name, info.host, info.doc_count);
  }
}

function replicate() {
  debug('Starting replication at package `%s`', startKey);

  return replicatePackages({
    limit: parseFloat(process.env.CONCURRENT_PACKAGES),
    startkey: startKey,
    // first time we skip nothing
    // see http://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    skip: 0
  });
}

function end(packagesDone) {
  debug('%d packages were replicated', packagesDone);

  // stop the agent, everything is finished
  // Node.JS will exit after this line
  keepaliveAgent.destroy();
}

function errorOccured(err) {
  setTimeout(function() {
    throw err;
  }, 0);
}

function replicatePackages(opts) {
  return db
    .allDocs({
      limit: opts.limit,
      startkey: opts.startkey,
      skip: opts.skip,
      include_docs: true
    })
    .then(handleAllDocsResponse);

    function handleAllDocsResponse(res) {
      if (!firstOffset) {
        firstOffset = res.offset;
      }

      if (res.total_rows === res.offset) {
        // That's all folks! We're done.
        return stopLoop(res.offset - firstOffset);
      }

      debug('%d packages to go', res.total_rows - res.offset);

      return saveToAlgolia(
          res
            .rows
            .map(getDocFromRow)
            .map(normalizePackage)
        )
        .then(saveLastPackageReplicated)
        .then(nextLoop);
    }

    function nextLoop(lastPackage) {
      return replicatePackages({
        limit: opts.limit,
        startkey: lastPackage,
        // skip `lastPackage` from results on next loop
        skip: 1
      });
    }
}

function stopLoop(packagesDone) {
  return Promise.resolve(packagesDone);
}

function saveLastPackageReplicated(packages) {
  var lastPackage = packages[packages.length - 1].name;

  if (process.env.DRY_MODE !== 'yes') {
    replicationStore.set(lastPackage);
  }

  return Promise.resolve(lastPackage);
}

function getDocFromRow(row) {
  return row.doc;
}
