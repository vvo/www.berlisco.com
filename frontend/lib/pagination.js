module.exports = pagination;

var qs = require('querystring');

function pagination($container, onClick) {
  return new Pagination($container, onClick);
}

function Pagination($container, onClick) {
  this.$container = $container;
  this.$currentPage = $container.querySelector('.current-page');
  this.$next = $container.querySelector('.next');
  this.$previous = $container.querySelector('.previous');

  [this.$currentPage, this.$next, this.$previous].forEach(function listenForClick($element) {
    $element.addEventListener('click', onClick);
  });
}

Pagination.prototype.update = function(currentPage, nbPages, searchQuery) {
  if (nbPages === 1) {
    this.$container.classList.add('hide');
    return;
  }

  this.$container.classList.remove('hide');

  if (currentPage > 1) {
    this.$previous.classList.remove('hide');
    this.$previous.setAttribute('href', '?' + qs.stringify({
      q: searchQuery,
      p: currentPage - 1
    }));
  } else {
    this.$previous.classList.add('hide');
  }

  if (currentPage < nbPages) {
    this.$next.classList.remove('hide');
    this.$next.setAttribute('href', '?' + qs.stringify({
      q: searchQuery,
      p: currentPage + 1
    }));
  } else {
    this.$next.classList.add('hide');
  }

  this.$currentPage.setAttribute('href', '?' + qs.stringify({
    q: searchQuery,
    p: currentPage
  }));

  this.$currentPage.textContent = currentPage;
};

Pagination.prototype.hide = function() {
  this.$container.classList.add('hide');
};
