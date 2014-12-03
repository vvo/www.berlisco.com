var AlgoliaSearch = require('algoliasearch');
var fs = require('fs');
var hyperglue = require('hyperglue');
var truncate = require('truncate');

var client = new AlgoliaSearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_SEARCH_ONLY_API_KEY
);
var index = client.initIndex(
  process.env.ALGOLIA_NPMREGISTRY_INDEX_NAME
);

var html = fs.readFileSync(__dirname + '/package.html', 'utf8');
var $search = document.querySelector('#search');
var $results = document.querySelector('#results');
var lastSearch;

$search.addEventListener('keyup', search);

function search() {
  var newSearch = this.value.trim();

  // ignore modifier keys (ctrl, shift..)
  if (newSearch === lastSearch) {
    // need to check for modifiers keys explicitly
    return;
  }

  emptyElement($results);

  lastSearch = newSearch;

  if (newSearch === '') {
    return;
  }

  index.search(newSearch, function(success, content) {
    if (content.hits.length === 0) {
      notFound();
      return;
    }

    content.hits.forEach(addToResults);
  });
}

function addToResults(pkg) {
  var repo = {};

  if (pkg.github) {
    repo.url = 'https://github.com/' + pkg.github.user + '/' + pkg.github.repo;
    repo.text = pkg.github.user + '/' + pkg.github.repo;
  } else {
    repo.url = 'https://www.npmjs.org/doc/files/package.json.html#repository';
    repo.text = 'no repository';
  }

  console.log(pkg.version);

  $results.appendChild(hyperglue(html, {
    '.name': pkg.name,
    '.description': truncate(pkg.description, 100),
    '.version': pkg.version,
    '.github-link': {
      href: repo.url,
      _text: repo.text
    }
  }));
}

function notFound() {
  $results.textContent = 'No results';
}

function emptyElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
