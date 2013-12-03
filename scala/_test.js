//winston
// var winston = require('winston');
var winston = require('D:\\nodejs_project\\star_admin_server\\node_modules\\winston\\lib\\winston.js');
var fs = require('fs');
if(!fs.existsSync('./log')) fs.mkdirSync('log');

var logger = new(winston.Logger)({
	transports: [ 
		new winston.transports.File({ filename: './log/winston.log'})	
	],
	exceptionHandlers: [new winston.transports.File({filename: './log/exceptions.log'})]	
});  

global.logger = logger; 

var scala = require('./scalaMgr');
var scalaMgr = scala( 'http://192.168.5.189:8080', { username: 'administrator', password: '53768608' } );
// var scalaMgr = scala( 'http://www.feltmeng.idv.tw:8080', { username: 'administrator', password: '53768608' } );
// var scalaMgr = scala( 'http://220.128.120.51:8080', { username: 'administrator', password: '28469434' } );

setTimeout(function(){
    
    //ScalaMgr APIs : listTimeslot()
    /* var oneday = '2013/10/03 10:00:00';
    scalaMgr.listTimeslot( oneday, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    } ); */
    
    //ScalaMgr APIs : setItemToPlaylist()
    /* var option = 
    {
        //playlist: { name: 'last' },
        playTime: { start: '2013-07-21 12:30:00', end: '2013-07-22 17:50:00', duration: 35 },
        file: {
            name : 'test_0.avi',
            path : 'C:\\tmp\\',
            savepath : ''
        }
    };
    scalaMgr.setItemToPlaylist( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    } ); */
    
    //ScalaMgr APIs : uploadMediaItem()
    /* var option = 
    {
        file: {
            name : 'test_0.avi',
            path : 'C:\\tmp\\',
            savepath : ''
        }
    };
    scalaMgr.uploadMediaItem( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    } ); */
    
    //ScalaMgr APIs : validProgramExpired()
    /* var option =
    {
        search: 'lastModified'
    };
    scalaMgr.validProgramExpired(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : pullPlaylistItem()
    /* var option = {
        playlistItem: { id: 35 },
        playlist: { name: 'lastModified' }
    };    
    scalaMgr.pullPlaylistItem(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : pushMediaToPlaylist()
    /* var setting = {
        media: { name: 'Jeff' },
        playlist:{ name: 'Audio' },
        playTime: { start: '2013-08-27 10:00:00', end: '2013-08-27 22:00:00', duration: 50 }
    };    
    scalaMgr.pushMediaToPlaylist(setting, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : clearPlaylistItems()
    /* scalaMgr.clearPlaylistItems(function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : setWebpageToPlaylist()
    /* var option = 
    {
        //playlist: { name: 'last' },
        playTime: { start: '2013-07-22 18:00:00', end: '2013-07-22 19:00:00', duration: 50 },
        webpage: {
            name: 'web_test',
            uri: 'www.feltmeng.idv.tw'
        }
    };
    scalaMgr.setWebpageToPlaylist(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : removePlaylist()
    /* var option =
    {
        search: 'OnDaScreen-'
    };
    scalaMgr.removePlaylist(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : clearMedia()
    /* var option =
    {
        search: 'web_test'
    };
    scalaMgr.clearMedia( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    //ScalaMgr APIs : pushEvent()
    /* var option = { 
        playlist: { search: 'lastModified', play: 'OnDaScreen' },
        player: { name: 'feltmeng' } 
    };
    scalaMgr.pushEvent( option, function(res){
        console.log(res);
    }); */
    
    //ScalaMgr APIs : dumpPlaylist()
    /* var option = { 
        playlist: { name: 'OnDaScreen' },
        logger: { name: 'playlist.log' }
    };
    scalaMgr.dumpPlaylist( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
        
}, 2000);
