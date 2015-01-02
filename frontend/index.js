var AlgoliaSearch = require('algoliasearch');
var debounce = require('lodash.debounce');
var debug = require('debug')('berlisco:main');
window.debug = require('debug');
var classes = require('dom-classes');
var fs = require('fs');
var hyperglue = require('hyperglue');
var page = require('page');
var qs = require('querystring');
var truncate = require('truncate');
var request = require('superagent');

var client = new AlgoliaSearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_SEARCH_ONLY_API_KEY
);
var index = client.initIndex(
  process.env.ALGOLIA_NPMREGISTRY_INDEX_NAME
);

var html = fs.readFileSync(__dirname + '/package.html', 'utf8');
var latestSearchTime;
var loader = new Loader();
var pageLoad = true;
var pagination = require('./pagination')(document.querySelector('.pagination'), scrollTop);
var $results = document.querySelector('.results');
var $searchInput = document.querySelector('.search-bar input');

insertSVGIcons();

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

function insertSVGIcons() {
  request
    .get('/svgdefs.svg')
    .end(function downloaded(err, res) {
      if (err || res.error) {
        debug('cannot get svg icons');
        return;
      }

      var DOMIcons = document.createElement('div');
      DOMIcons.innerHTML = res.text;
      DOMIcons
        .querySelector('svg')
        .setAttribute('display', 'none');
      document.body.appendChild(DOMIcons);
    });
}

// only show a loader after 200ms
function Loader() {
  this.$element = document.querySelector('.loader');
}

Loader.prototype.show = function() {
  if (this.timer) {
    clearTimeout(this.timer);
  }

  this.timer = setTimeout(this._show.bind(this), 200);
};

Loader.prototype._show = function() {
  classes.remove(this.$element, 'hide');
};

Loader.prototype.hide = function() {
  clearTimeout(this.timer);
  classes.add(this.$element, 'hide');
};
