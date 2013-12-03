
var ml = {};

ml.logger = require('./lib/logger.js');

ml.init = function( options ) {
    var body = {};
    options.transports.forEach(function( log ){
        body[log.method] = log[log.method];
    });
    
    return body;
};

module.exports = ml;
