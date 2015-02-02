module.exports = normalizePackage;

var debug = require('debug')('berlisco:normalize-package');
var normalize = require('npm-registry/normalize').packages;

function normalizePackage(pkg) {
  var normalized = normalize(pkg);

  var cleaned = {
    name: normalized.name,
    description: normalized.description,
    keywords: normalized.keywords,

    // author: an object like
    // "author":{"name":"tmpvar","email":"tmpvar@gmail.com","gravatar_id":"..","gravatar":".."}
    author: normalized.maintainers[0],

    // github:
    // "github":{"user":"tmpvar","repo":"polygon.clip.js"}
    github: normalized.github,

    // array of authors
    maintainers: normalized.maintainers,

    version: normalized.latest.version,
    dependenciesCount: Object.keys(normalized.dependencies).length,
    releasesCount: Object.keys(normalized.releases).length,
    bin: normalized.bin,
    created: normalized.created,
    modified: normalized.modified
  };

  debug('normalized package to %j', cleaned);
  return cleaned;
}
