
var ml = require('multi-loggers');

var logger = new ml.init({
    transports : [
        new ml.logger.setting({ method : 'info', file : 'info.log' }),
        new ml.logger.setting({ method : 'err', file : 'err.log' }),
    ]
});

logger.info('test info.');
logger.err('test err.');
