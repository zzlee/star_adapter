

var fs = require('fs');

var logger = {};

logger.setting = function( options ) {
    
    var transport = {};
    var method = options.method;
    var filepath = options.file;
    
    // fs.existsSync(file)
      // ? fs.writeFileSync( file, '' );
      // : '';
    
    var file = fs.createWriteStream(filepath, { 
        flags: 'a+',
        encoding: 'utf-8',
        mode: 0777 
    });
    
    transport.method = method;
    
    transport[method] = function( message ){
        var content = 
        {
            message : message,
            timestamp : new Date()
        }
        file.write( JSON.stringify(content) + '\n' );
    };
    
    return transport;
};

module.exports = logger;

/* 
var mkdir = function( file ) {
    
    var path = file.split('\\');
    
    path.forEach( function(entry){
        fs.existsSync( entry )
          ? fs.mkdirSync(entry, 0777)
          : '';
        
    } );
    
};
 */
