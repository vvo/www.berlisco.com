module.exports = insertSVGDefs;

var debug = require('debug')('berlisco:lib/insert-svg');
var request = require('superagent');

function insertSVGDefs(source) {
  request
    .get(source)
    .end(function downloaded(err, res) {
      if (err || res.error) {
        debug('cannot get svg icons at %s', source);
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
