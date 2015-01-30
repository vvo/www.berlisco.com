var AlgoliaSearch = require('algoliasearch');
var debounce = require('lodash.debounce');
var debug = require('debug');
var classes = require('dom-classes');
var fs = require('fs');
var hyperglue = require('hyperglue');
var page = require('page');
var qs = require('querystring');
var truncate = require('truncate');

debug.enable('berlisco:*');

require('./lib/insert-svg-defs')('/svgdefs.svg');
var loader = require('./lib/loader')(document.querySelector('.loader'));
var pagination = require('./lib/pagination')(document.querySelector('.pagination'), scrollTop);

var client = new AlgoliaSearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_SEARCH_ONLY_API_KEY
);
var index = client.initIndex(
  process.env.ALGOLIA_NPMREGISTRY_INDEX_NAME
);

var html = fs.readFileSync(__dirname + '/package.html', 'utf8');
var latestSearchTime;
var pageLoad = true;
var $results = document.querySelector('.results');
var $searchInput = document.querySelector('.search-bar input');

debug = debug('berlisco:index');

$searchInput.addEventListener('input', debounce(search, 155, {
  leading: false,
  trailing: true
}));

$searchInput.addEventListener('keyup', blurIfEscape);

function search() {
  var toSearch = this.value.trim();

  latestSearchTime = Date.now();

  if (toSearch === '') {
    page('/');
  } else {
    page('?q=' + encodeURIComponent(toSearch));
  }
}

function blurIfEscape(e) {
  if (e.keyCode === 27) {
    $searchInput.blur();
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
  var searchQuery = ctx.query.q;
  var currentPage = ctx.query.p || 1;

  emptyElement($results);
  pagination.hide();
  loader.hide();

  if (!searchQuery) {
    debug('nothing to search');
    return;
  }

  // fill default search value at pageLoad
  if (pageLoad && $searchInput.value === '' && searchQuery !== undefined) {
    debug('set initial search value to `%s`', searchQuery);
    $searchInput.value = searchQuery;
  }

  pageLoad = false;

  loader.show();

  index.search(searchQuery, searchDone, {
    page: currentPage - 1
  });

  function searchDone(success, res) {
    // a more recent search was triggered, forget this response
    if (latestSearchTime > currentSearchTime) {
      debug('dropped results for `%s` because a more recent search happened', searchQuery);
      return;
    }

    loader.hide();

    if (res.hits.length === 0) {
      debug('nothing found for `%s`', searchQuery);
      notFound();
      return;
    }

    res.hits.forEach(addToResults);

    pagination.update(res.page + 1, res.nbPages, searchQuery);
  }
}

function addToResults(pkg) {
  var downloads = pkg.downloads && pkg.downloads.current || 0;
  var githubLink;

  if (pkg.github) {
    githubLink = 'https://github.com/' + pkg.github.user + '/' + pkg.github.repo;
  }

  var npmjsLink = 'https://www.npmjs.com/package/' + pkg.name;

  var pkgElement = hyperglue(html, {
    '.name': pkg.name,
    '.npmjs-link': {
      href: npmjsLink
    },
    '.github-link': {
      href: githubLink
    },
    '.description': truncate(pkg.description, 100),
    '.downloads': downloads.toLocaleString()
  });

  // handle cases where there is no github link
  if (!githubLink) {
    classes.add(pkgElement.querySelector('.github-link'), 'hide');
    classes.remove(pkgElement.querySelector('.no-gh'), 'hide');
  }

  $results.appendChild(pkgElement);
}

function notFound() {
  $results.textContent = 'No results';
}

function emptyElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function scrollTop() {
  document.documentElement.scrollIntoView();
}

// bind `/` when not in search bar to focus search bar
// gmail style search
document.addEventListener('keyup', function bindShortcut(e) {
  if (e.target === $searchInput) {
    return;
  }

  if (e.keyCode !== 191) {
    return;
  }

  $searchInput.focus();
});
