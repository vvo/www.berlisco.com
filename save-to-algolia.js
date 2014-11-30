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
var index = client.initIndex(process.env.ALGOLIA_INDEX_NAME);

var debugLabelSuffix = process.env.DRY_MODE === 'yes' ? '-DRY-MODE' : '';
var debug = require('debug')('npmfind:save-to-algolia' + debugLabelSuffix);
var saveObjects = Promise.denodeify(index.saveObjects.bind(index));

module.exports = saveToAlgolia;

function saveToAlgolia(packages) {
  if (!Array.isArray(packages)) {
    packages = [packages];
  }

  packages = packages.map(addObjectID);

  debug('Saving %d package(s) to algolia', packages.length);

  if (process.env.DRY_MODE === 'yes') {
    debug('Would have saved packages: %j', packages.map(pickName));
    return Promise.resolve(packages);
  }

  return saveObjects(packages).then(returnPackages);

  function returnPackages() {
    return packages;
  }
}

function addObjectID(pkg) {
  pkg.objectID = pkg.name;
  return pkg;
}

function pickName(pkg) {
  return pkg.name;
}
