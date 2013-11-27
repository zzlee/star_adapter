
var channel = (function() {
    
    var adapter, token;
    var connectMgr = require('./connectMgr.js');
    
    var _private = {
        list : function( option, list_cb ) {
            if( typeof(option) == 'function') { list_cb = option; }
            connectMgr.checkCollision('channel.list', function(status){
                adapter.get('/ContentManager/api/rest/channels?limit=10&offset=0&sort=name&token=' + token, function(err, req, res, obj) {
                    list_cb(obj);
                });
            });
        },
        register : function( auth ) {
            adapter = auth.adapter;
            token = auth.token;
        },
        reserved : function() {}
    };

    return {
    
        init : function(){
            var self = this;
            connectMgr.request(function( auth ){
                _private.register( auth );
                // return self;
            });
        },
        list : function( option, list_cb ) {
            _private.list( option, list_cb );
        },
    };
}());

module.exports = channel;