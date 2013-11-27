
var item = (function() {
    
    var connectMgr = require('./connectMgr.js');
    var adapter, token;
    
    var _private = {
        register : function( auth ) {
            adapter = auth.adapter;
            token = auth.token;
        },
        addItem : function( option, addItem_cb ) {
            connectMgr.checkCollision('channel.addItem', function(status){
                adapter.put('/ContentManager/api/rest/playlists/' + option.playlist.id + '/playlistItems/' + option.media.id + '?token=' + token, {}, function(err, req, res, obj){
                    addItem_cb(err, obj);
                });
            });
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
        addItemToPlaylist : function( option, addItem_cb ){
            _private.addItem( option, addItem_cb );
        },
    };
}());

module.exports = item;