const scanner = require('./lib/scanner');
const results = scanner.scanContent('// TODO: fix this later', ['TODO']);
console.log(JSON.stringify(results, null, 2));
