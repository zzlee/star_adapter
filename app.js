var systemConfig = require('./system_configuration.js').getInstance();
if ( (systemConfig.HOST_STAR_COORDINATOR_URL===undefined) || (systemConfig.IS_STAND_ALONE===undefined) ) {
    console.log("ERROR: system_configuration.json is not properly filled!");
    process.exit(1);
}
global.systemConfig = systemConfig;

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');
var fs = require('fs');
var winston = require('winston');
var async = require('async');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var workingPath = process.cwd();
var logDir = path.join(workingPath,'log');
if (!fs.existsSync(logDir) ){
    fs.mkdirSync(logDir);
}
var logger = new(winston.Logger)({
    transports: [ 
        new winston.transports.File({ filename: './log/winston.log'})   
    ],
    exceptionHandlers: [new winston.transports.File({filename: './log/exceptions.log'})]    
});  
global.logger = logger; 

var scheduleMgr = require('./schedule_mgr.js');

async.waterfall([
                 function(callback){
                     //Defiene the RESTful APIs
                     
                     app.get('/', routes.index);
                           
                     http.createServer(app).listen(app.get('port'), function(){
                         console.log('Express server listening on port ' + app.get('port'));
                         callback(null);
                     });
                 },
                 function(callback){
                     
                     callback(null);
                 }
             ], function (err) {
                 if (err){
                     console.log('app.js initializes with errors: '+err);
                 }
             });