var normalize = require('npm-registry/normalize').packages;

module.exports = normalizePackage;

function normalizePackage(pkg) {
  pkg = normalize(pkg);
  return {
    name: pkg.name,
    description: pkg.description,
    keywords: pkg.keywords,
    author: pkg._npmUser,
    licenses: pkg.licenses,
    github: pkg.github,
    maintainers: pkg.maintainers,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
    version: pkg.latest.version,
    releases: pkg.releases,
    bin: pkg.bin,
    created: pkg.created,
    modified: pkg.modified
  };
}
