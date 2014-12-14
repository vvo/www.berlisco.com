// This module gives you the download count for a particular `package`.
// You get two time periods for downloads:
//   1. now - 1 month() => now()
//   2. now - 2 months() => now - 1 month()
module.exports = downloadCount;

var Agent = require('agentkeepalive').HttpsAgent;
var debug = require('debug')('download-count');
var moment = require('moment');
var Promise = require('promise');
var request = require('superagent');

var keepaliveAgent = new Agent();
var now = moment().format('YYYY-MM-DD');
var current = moment().subtract(1, 'months').format('YYYY-MM-DD');
var previous = moment().subtract(2, 'months').format('YYYY-MM-DD');

function downloadCount(packageName) {
  return Promise
    .all([
      downloadCountPeriod(packageName, current, now),
      downloadCountPeriod(packageName, previous, current)
    ]);
}

function downloadCountPeriod(packageName, startPeriod, endPeriod) {
  return new Promise(function get(resolve, reject) {
    var util = require('util');

    var downloadPeriod = startPeriod + ':' + endPeriod;

    var url = util.format(
      'https://api.npmjs.org/downloads/point/%s/%s',
      downloadPeriod,
      packageName
    );

    debug(
      'Getting download stats from `%s` to `%s` for package `%s`',
      startPeriod,
      endPeriod,
      packageName
    );

    request
      .get(url)
      .agent(keepaliveAgent)
      .on('error', reject)
      .end(function done(res) {
        if (res.error) {
          reject(res.error);
          return;
        }

        resolve(res.body.downloads);
      });
  });
}
