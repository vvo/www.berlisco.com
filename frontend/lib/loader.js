module.exports = loader;

function loader(element) {
  return new Loader(element);
}

// only show a loader after 200ms
function Loader(element) {
  this.element = element;
}

Loader.prototype.show = function() {
  if (this.timer) {
    clearTimeout(this.timer);
  }

  this.timer = setTimeout(this._show.bind(this), 200);
};

Loader.prototype._show = function() {
  this.element.classList.remove('hide');
};

Loader.prototype.hide = function() {
  this.element.classList.add('hide');
  clearTimeout(this.timer);
};
