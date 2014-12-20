var AlgoliaSearch = require('algoliasearch');
var debounce = require('lodash.debounce');
var debug = require('debug')('berlisco:main');
window.debug = require('debug');
var fs = require('fs');
var hyperglue = require('hyperglue');
var page = require('page');
var qs = require('querystring');
var truncate = require('truncate');

var client = new AlgoliaSearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_SEARCH_ONLY_API_KEY
);
var index = client.initIndex(
  process.env.ALGOLIA_NPMREGISTRY_INDEX_NAME
);

var html = fs.readFileSync(__dirname + '/package.html', 'utf8');
var $search = document.querySelector('.search-bar input');
var $results = document.querySelector('.results');
var lastSearch;
var latestSearchTime;
var pageLoad = true;

insertSVGIcons();

$search.addEventListener('keyup', debounce(search, 100, {
  leading: false,
  trailing: true
}));

function search() {
  var newSearch = this.value.trim();

  // ignore modifier keys (ctrl, shift..)
  if (newSearch === lastSearch) {
    // need to check for modifiers keys explicitly
    return;
  }

  latestSearchTime = Date.now();

  emptyElement($results);

  lastSearch = newSearch;

  if (newSearch === '') {
    page('/');
  } else {
    page('?q=' + encodeURIComponent(newSearch));
  }
}

page('*', parse);
page('/', show);
page();

function parse(ctx, next) {
  // let Page.js update the url before parsing it, otherwise
  // you are always late one keystroke
  setTimeout(function() {
    ctx.query = qs.parse(location.search.slice(1));
    next();
  }, 0);
}

function show(ctx) {
  var currentSearchTime = Date.now();

  if (!ctx.query.q) {
    debug('nothing to search');
    return;
  }

  // fill default search value at pageLoad
  if (pageLoad && $search.value === '' && ctx.query.q !== undefined) {
    debug('set initial search value to `%s`', ctx.query.q);
    $search.value = ctx.query.q;
  }

  pageLoad = false;

  index.search(ctx.query.q, function(success, content) {
    // a more recent search was triggered, forget this response
    if (latestSearchTime > currentSearchTime) {
      debug('dropped results for `%s` because a more recent search happened', ctx.query.q);
      return;
    }

    if (content.hits.length === 0) {
      debug('nothing found for `%s`', ctx.query.q);
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
    repo.text = truncate(pkg.github.user + '/' + pkg.github.repo, 20);
  } else {
    repo.url = 'https://www.npmjs.org/doc/files/package.json.html#repository';
    repo.text = 'no repository';
  }

  $results.appendChild(hyperglue(html, {
    '.name': {
      href: '//www.npmjs.com/package/' + pkg.name,
      _text: pkg.name
    },
    '.description': truncate(pkg.description, 100),
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

// bind `/` when not in search bar to focus search bar
// gmail style search
document.addEventListener('keyup', function bindShortcut(e) {
  if (e.target === $search) {
    return;
  }

  if (e.keyCode !== 191) {
    return;
  }

  $search.focus();
});

function insertSVGIcons() {
  var icons = fs.readFileSync(__dirname + '/svgdefs.svg', 'utf-8');
  var DOMIcons = document.createElement('div');
  DOMIcons.innerHTML = icons;
  document.body.appendChild(DOMIcons);
}
