var HttpsAgent = require('agentkeepalive').HttpsAgent;
var path = require('path');
var Promise = require('promise');
var PouchDB = require('pouchdb');

var debug = require('debug')('berlisco:save-download-count');
var downloadCount = require('../download-count');

var keepaliveAgent = new HttpsAgent();

var replicationStore = require('../replication-store')(
  path.resolve(__dirname, '..', process.env.DOWNLOAD_COUNT_LAST_PACKAGE_STORE)
);
var updateAlgoliaObject = require('../update-algolia-object');

var db = new PouchDB(process.env.NPM_REGISTRY_COUCHDB_ENDPOINT, {
  ajax: {
    agent: keepaliveAgent
  }
});
var firstOffset;
var startKey = replicationStore.get();

showDbInfos()
  .then(update)
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

function update() {
  debug('Start getting download count at package `%s`', startKey);

  return updateDownloadCount({
    limit: parseFloat(process.env.CONCURRENT_PACKAGES),
    startkey: startKey,
    // first time we skip nothing
    // see http://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html
    skip: 0
  });
}

function end(packagesDone) {
  debug('%d packages got their download count updated', packagesDone);

  // stop the agent, everything is finished
  // Node.JS will exit after this line
  keepaliveAgent.destroy();
}

function errorOccured(err) {
  setTimeout(function() {
    throw err;
  }, 0);
}

function updateDownloadCount(opts) {
  return db
    .allDocs({
      limit: opts.limit,
      startkey: opts.startkey,
      skip: opts.skip
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

      return Promise
        .all(res.rows.map(getDownloadCount))
        .then(updateAlgoliaObject)
        .then(saveLastUpdatedPackage)
        .then(nextLoop);
    }

    function nextLoop(lastPackage) {
      return updateDownloadCount({
        limit: opts.limit,
        startkey: lastPackage,
        // skip `lastPackage` from results on next loop
        skip: 1
      });
    }
}

function getDownloadCount(row) {
  return downloadCount(row.id)
    .then(function done(downloads) {
      return {
        name: row.id,
        downloads: {
          current: downloads[0],
          previous: downloads[1]
        }
      };
    });
}

function stopLoop(packagesDone) {
  return Promise.resolve(packagesDone);
}

function saveLastUpdatedPackage(packages) {
  var lastPackage = packages[packages.length - 1].name;

  if (process.env.DRY_MODE !== 'yes') {
    replicationStore.set(lastPackage);
  }

  return Promise.resolve(lastPackage);
}
