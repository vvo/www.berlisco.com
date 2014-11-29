var fs = require('fs');

module.exports = function replicationStore(storePath) {

  return {
    get: function get() {
      var sequences = fs
        .readFileSync(storePath, {
          encoding: 'utf8'
        })
        .split('\n');

      // remove empty last line
      sequences.pop();

      return sequences.pop();
    },
    set: function set(last_seq) {
      fs
        .writeFileSync(storePath, last_seq + '\n', {
          encoding: 'utf8',
          flag: 'a+'
        });
    }
  };
};
