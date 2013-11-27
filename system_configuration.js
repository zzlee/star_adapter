//var xml2js = require('xml2js');
var path = require('path');
var fs = require('fs');

var FM = {};
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info(str); } : function(str){} ;

FM.confuguration = (function(){
    var uInstance = null;
    
    function constructor(constructed_cb){
        
        var workingPath = process.cwd();
        
        var configData = null;
        try {
        	configData = fs.readFileSync( path.join(workingPath, 'system_configuration.json') );
        } catch (e) {
            console.log( 'Fail to read configuration.xml:');
            console.dir(e);
            console.log( 'If it does not exist, copy from a template in /setup folder ');
            process.exit(1);
        }
        
        return JSON.parse(configData);
    };
    
    
    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            
            return uInstance;
        }

    };
    
})();

//console.dir(FM.confuguration.getInstance());


module.exports = FM.confuguration;