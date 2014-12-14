if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('Please setup ALGOLIA_APP_ID and ALGOLIA_API_KEY environment variables.');
}

var Algolia = require('algolia-search');
var HttpsAgent = require('agentkeepalive').HttpsAgent;
var Promise = require('promise');

var keepaliveAgent = new HttpsAgent();
var client = new Algolia(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY,
  keepaliveAgent
);
var index = client.initIndex(process.env.ALGOLIA_NPMREGISTRY_INDEX_NAME);

var debugLabelSuffix = process.env.DRY_MODE === 'yes' ? '-DRY-MODE' : '';
var debug = require('debug')('npmfind:update-algolia-object' + debugLabelSuffix);

module.exports = updateAlgoliaObject;

function updateAlgoliaObject(packages) {
  if (!Array.isArray(packages)) {
    packages = [packages];
  }

  packages = packages.map(addObjectID);

  debug('Updating %d package(s) to algolia', packages.length);

  if (process.env.DRY_MODE === 'yes') {
    debug('Would have updated packages: %j', packages.map(pickName));
    return Promise.resolve(packages);
  }

  return new Promise(function save(resolve, reject) {
    index
      .partialUpdateObjects(packages, function done(err, res) {
        if (err) {
          reject(res);
          return;
        }

        resolve(packages);
      });
  });
}

function addObjectID(pkg) {
  pkg.objectID = pkg.name;
  return pkg;
}

function pickName(pkg) {
  return pkg.name;
}
