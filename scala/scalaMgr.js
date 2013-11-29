/*
 * Login to server and get module function.
 * 
 * constructor
 * param {string} url The server URL.
 * param {object} account The username and password in account to login.
 * return {function} listTimeslot List timeslots from server.
 * return {function} setItemToEvent Set item in timeslot to server.
 * return {function} pushEvent Push program to scala server.
**/
/**
 * The manager who handles interfacing Scala Enterprise
 *
 * @mixin
 */
function scalaMgr( url, account ){
    
    var assert = require('assert');
    var async = require('async');
    var restify = require('restify').createJsonClient({url: url});
    
    var pushFlag = false;
    
    var playlist = require('./playlistMgr.js')
      , channel = require('./channelMgr.js')
      , item = require('./itemMgr.js')
      , schedule = require('./scheduleMgr.js')
      , media = require('./mediaMgr.js')
      , player = require('./playerMgr.js');
    
    playlist.init();
    channel.init();
    item.init();
    schedule.init();
    media.init();
    player.init();

    var contractor = {
        playlist : playlist,
        channel : channel,
        item : item,
        schedule : schedule,
        media : media,
        player : player
    };
    
    require('./connectMgr.js').init( restify, account );
    
    var weekdays = { 'SUNDAY' : 0, 'MONDAY' : 1, 'TUESDAY' : 2, 
                 'WEDNESDAY' : 3,'THURSDAY' : 4, 'FRIDAY' : 5, 'SATURDAY' : 6 };
    var checkWeekday = function( check, weekslots, check_cb ){
        if(typeof(weekslots) === 'string') {
            if(check == weekdays[weekslots]) check_cb('OK');
            else check_cb('FAILED');
        }
        else for(var i=0; i < weekslots.length; i++) {
            if(check == weekdays[weekslots[i]]) { check_cb('OK'); break; }
            if(i == weekslots.length - 1) check_cb('FAILED');
        }
    };
    var durationToNumber = function( time ){
        var duration = time[0].split(':');
        return (Number(duration[0]) * 60 + Number(duration[1])) * 1000;
    };
    var timeToInt = function( dateData, time ){
        time = time.split(':');
        var date = new Date(dateData);
        
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time[0], time[1], time[2]).getTime();
    };
    var cutOffPlaylistItem = function(target, playlistItemList, cutOff_cb){
        var afterPlaylistItem = '';
        for(var i=0; i<playlistItemList.length; i++){
            if(target.id == playlistItemList[i].id){
                playlistItemList[i].deleteFlag = true;
            }
            if(i == playlistItemList.length-1){
                cutOff_cb(playlistItemList);
            }
        }
    };
    var isCheckContent = function( fileInfo, check_cb ){        
        contractor.media.list({search: fileInfo.name}, function(err, res){ 
            if(typeof(res.list) === 'undefined')
                check_cb(false);
            else
                check_cb(true);
        });
    };
    var isExistedOfPlaylist = function(search, isExisted_cb){
        contractor.playlist.list({ fields: 'id', search: search }, function(err, res){
            (res.count > 0)?isExisted_cb({ exist: true, id: res.list[0].id }):isExisted_cb({ exist: false, id: null });
        });
    };
    
    /**
     * List timeslots from server.
     * 
     * @param {string} name The name is search condition for timeslot.
     * @param {string} channel The channel number for play to DOOH.
     * @param {string} frame The frame of channel playing.
     * @param {string} startDate The start date.
     * @param {string} endDate The end date.
     * @param {function} timeslot_cb Report timeslot list in json.
     *     @param {string} playlistInfo The playlistInfo have name, time, duration, mode and more.
     *     @param {boolean} valid The valid show this timeslot is valid.
     */
    var listTimeslot = function(oneday, timeslot_cb){
        var result = [];
    
        var option = {
            channel : { id: 1, frames: 1 }, //hardcode
            date : new Date(oneday),
        };
        contractor.schedule.findTimeslots(option, function(list){
            if(typeof(list.timeslots) === 'undefined') {
                timeslot_cb('no find timeslot', null);
            }
            else {
                for(var i=0; i < list.timeslots.length; i++){
                    if(list.timeslots[i].playlist.name.match(/FM/i)) {
                        checkWeekday(option.date.getDay(), list.timeslots[i].weekdays, function(status){
                            var timeslotDeadline;
                            if((typeof(list.timeslots[i].endDate) === 'undefined'))
                                timeslotDeadline = new Date(option.date.getTime() + 86399000);
                            else if((list.timeslots[i].endTime == '24:00:00'))
                                timeslotDeadline = new Date(list.timeslots[i].endDate + ' 23:59:59');
                            else 
                                timeslotDeadline = new Date(list.timeslots[i].endDate + ' ' + list.timeslots[i].endTime);
                            //console.log(list.timeslots[i].endDate);
                            if((option.date.getTime() <= timeslotDeadline.getTime()) && (status == 'OK')){
                                result.push({
                                    //playlist: list.timeslots[i].playlist.name,
                                    interval: {
                                        start: timeToInt(oneday, list.timeslots[i].startTime),
                                        end: timeToInt(oneday, list.timeslots[i].endTime)
                                    },
                                    cycleDuration: durationToNumber(list.timeslots[i].playlist.prettifyDuration.replace('(','').replace(')','').split(' - '))
                                });
                            }
                        });
                    }
                    if(i == list.timeslots.length-1) timeslot_cb(null, result);
                }
            }
        });
        
    };
    
    /**
     * Add item in timeslot to server.
     * 
     * @param {Object} item The item upload to scala server.
     *     <ul>
     *     <li> path: The path is file path.
     *     <li> filename: The filename is file title.
     *     </ul>
     * @param {Object} playTime The playTime is program play to DOOH in specific time.
     * @param {Function} reportStatus_cb Report media id and playlistItem id in playlist.
     */
    var setItemToPlaylist = function( option, reportStatus_cb ){
        
        var limit = 0;
        
        var file = option.file,
            playTime = option.playTime;
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
        
        var setting = {
            media: { name: file.name },
            playlist: { name: playlistName },
            playTime: { start: playTime.start, end: playTime.end, duration: playTime.duration }
        };
        
        async.waterfall([
            function(callback){
                if(limit < 1){
                    isCheckContent(file, function(existStatus){
                        if(existStatus){
                            callback(null, 'OK');
                        }
                        else {
                            contractor.media.fileupload(file, function(err, status){
                                callback(null, status);
                            });
                        }
                    });
                    limit++;
                }
            },
            function(status, callback){
                if(status == 'OK') {
                    pushMediaToPlaylist(setting, function(err, res){
                        callback(err, res);
                    });
                }
            }
        ],function(err, result){
            limit = 0;
            if(!err) reportStatus_cb(null, result);
            else reportStatus_cb(err, null);
        });
    };
    
    /**
     * Add web page in timeslot to server.
     *
     */
    var setWebpageToPlaylist = function( option, reportStatus_cb ){
    
        var limit = 0;
        
        var webpage = option.webpage,
            playTime = option.playTime;
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
        
        var setting = {
            media: { name: webpage.name },
            playlist: { name: playlistName },
            playTime: { start: playTime.start, end: playTime.end, duration: playTime.duration }
        };
        
        async.waterfall([
            function(callback){
                if(limit < 1){
                    isCheckContent(webpage, function(existStatus){
                        if(existStatus){
                            callback(null, 'OK');
                        }
                        else {
                            contractor.media.createWebPage(webpage, function(err, status){
                                callback(null, status);
                            });
                        }
                    });
                    limit++;
                }
            },
            function(status, callback){
                if(status == 'OK') {
                    pushMediaToPlaylist(setting, function(err, res){
                        callback(err, res);
                    });
                }
            }
        ], function (err, result) {
            limit = 0;
            if(!err) reportStatus_cb(null, result);
            else reportStatus_cb(err, null);
        });
    };
    
    /**
     * Push media to playlist item.
     *
     */
    var pushMediaToPlaylist = function(option, reportPlaylistItem_cb){
        
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
        
        var setting = {
            media: { id: '', name: option.media.name },
            playlist: { id: '', name: playlistName, content: '', sort: 'name' },
            playTime: { start: option.playTime.start, end: option.playTime.end, duration: option.playTime.duration },
            playlistItem: { id: 0 }
        };
        
        var findPlaylistItemId = function(setting, findPlaylistItemId_cb){
            contractor.item.addItemToPlaylist(setting, function(err, res){
                contractor.playlist.list({search: setting.playlist.name}, function(err, res){
                    setting.playlist.content = res.list;
                    for(var i=0; i<res.list[0].playlistItems.length; i++) {
                        if(res.list[0].playlistItems[i].media.name.match(setting.media.name))
                            setting.playlistItem.id = Math.max(setting.playlistItem.id, res.list[0].playlistItems[i].id);
                    }
                    findPlaylistItemId_cb(err, setting);
                });
            });
        };
        
        async.series([
            function(step1){
                //step.1 - get media info
                contractor.media.list({search: setting.media.name}, function(err, res){ 
                    if(typeof(res.list) === 'undefined')
                        step1('NO_MEDIA_INFO', null);
                    else {
                        setting.media.id = res.list[0].id;
                        step1(null, 'done');
                    }
                });
            },
            function(step2){
                //step.2 - get playlist info and if not have playlist then create one.
                isExistedOfPlaylist(setting.playlist.name, function(status){
                    if(!status.exist) {
                        contractor.playlist.create({ name: setting.playlist.name }, function(err, res){
                            isExistedOfPlaylist(setting.playlist.name, function(status){
                                setting.playlist.id = status.id;
                                step2(null, 'done');
                            });
                        });
                    }
                    else {
                        setting.playlist.id = status.id;
                        step2(null, 'done');
                    }
                });
            },
        ], function(err, step3){
            //step.3 - find out playlist item id
            if(err){
                reportPlaylistItem_cb(err, null);
                return;
            }
            findPlaylistItemId(setting, function(err, res){
                if(err){
                    reportPlaylistItem_cb(err, null);
                    return;
                }
                //step.4 - update playlist item by playlist item id
                contractor.playlist.updatePlaylistItemScheduleById(setting, function(err, res){
                    if(err){
                        reportPlaylistItem_cb(err, null);
                        return;
                    }
                    reportPlaylistItem_cb(err, { 
                        media: setting.media,
                        playlist: { id: setting.playlist.id, name: setting.playlist.name },
                        playlistItem: setting.playlistItem 
                    });
                });
            });
        });
    };
    
    /**
     * Upload Media Item.
     * 
     */
    var uploadMediaItem = function(option, upload_cb){
    
        var file = option.file;
        
        if( !file.name ) upload_cb('No_File_Name', null);
        if( !file.path ) upload_cb('No_File_Path', null);
        
        var media = 
        {
            id: '',
            name: file.name
        };
        
        contractor.media.fileupload(file, function(err, status){
            // upload_cb(null, status);
            contractor.media.list({search: media.name}, function(err, res){ 
                if(typeof(res.list) === 'undefined')
                    upload_cb('NO_MEDIA_INFO', null);
                else {
                    media.id = res.list[0].id;
                    upload_cb(null, { media: media });
                }
            });
        });
    };
    
    /**
     * Pull playlist item.
     */
    var pullPlaylistItem = function(option, pull_cb){
    
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
            
        contractor.playlist.list({ search: playlistName }, function(err, playlistInfo){
            if(err)
                pull_cb(err, null);
            else {
                cutOffPlaylistItem(option.playlistItem, playlistInfo.list[0].playlistItems, function(afterPlaylistItems){
                    playlistInfo.list[0].playlistItems = afterPlaylistItems;
                    contractor.playlist.update({
                        playlist: { id: playlistInfo.list[0].id, content: playlistInfo.list[0] },
                    }, function(report){
                        pull_cb(null, report);
                    });
                });
            }
        });
    };
    
    /**
     * Clear all playlist Item
     *
     */
    var clearPlaylistItems = function(option, clear_cb){
        if(typeof(option) === 'function'){
            clear_cb = option;
            option = { playlist: { name: 'OnDaScreen' } }
        }
        contractor.playlist.list({ search: option.playlist.name }, function(err, res){
            if(err)
                clear_cb(err, null);
            else {
                res.list[0].playlistItems = [];
                var updateOption = {
                    playlist: { id: res.list[0].id, content: res.list[0] }
                };
                contractor.playlist.update({
                    playlist: { id: res.list[0].id, content: res.list[0] },
                }, function(res){
                    clear_cb(null, res);
                });
            }
        });
    };
    
    /**
     * Valid program expired
     *
     */
    var validProgramExpired = function( option, validExpired_cb ){
        
        var target, expired;
        
        if(typeof(option) === 'function')
        {
            validExpired_cb = option;
            target = { search: 'OnDaScreen' };
            expired = new Date().getTime();
        }
        else
        {
            (typeof(option.search) === 'undefined')?target = { search: 'OnDaScreen' }:target = { search: option.search };
            (typeof(option.expired) === 'undefined')?expired = new Date().getTime():expired = new Date(option.expired).getTime();
        }
        
        contractor.playlist.list(target, function(err, res)
        {
            //(err)?console.dir(err):console.dir(res);
            if(err)
            {
                validExpired_cb(err, null);
                return;
            }
            
            var validPlaylistItems = function(playlist, valid_cb){

                if(typeof(playlist.playlistItems) === 'undefined')
                {
                    valid_cb(null, { message: 'no item.' });
                    return;
                }
                else
                {
                    for(var i=0; i<playlist.playlistItems.length; i++)
                    {
                        var programValidDate;
                        if(playlist.playlistItems[i].useValidRange == false)
                            continue;
                        else if(playlist.playlistItems[i].timeSchedules.endTime == '24:00')
                            programValidDate = new Date(playlist.playlistItems[i].endValidDate + ' 23:59:59').getTime();
                        else
                            programValidDate = new Date(playlist.playlistItems[i].endValidDate + ' ' + playlist.playlistItems[i].timeSchedules.endTime + ':00').getTime();
                        if((typeof(programValidDate) !== 'undefined')&&(programValidDate < expired))
                            playlist.playlistItems[i].deleteFlag = true;
                    }
                }
                
                contractor.playlist.update({
                    playlist: { id: playlist.id, content: playlist },
                }, function(report){
                    valid_cb(null, report);
                });
            };
            
            var eventConsole = function(target, event){
                event.push(function(callback){ validPlaylistItems(target, callback); });
            };
            
            if(res.count == 0)
                validExpired_cb(null, 'no playlist');
            else
            {
                var execute = [];
                for(var i=0; i<res.count; i++)
                {
                    eventConsole(res.list[i], execute);
                }
                async.series(execute, function(err, res){
                    //(err)?console.dir(err):console.dir(res);
                    (err)?validExpired_cb(err, null):validExpired_cb(null, 'done');
                });
            }
            
        });
    };
    
    /**
     * Remove Playlist
     *
     */
    var removePlaylist = function( option, remove_cb ){
    
        var eventConsole = function(target, event){
            event.push(function(callback){ 
                contractor.playlist.remove({ playlist: { id: target } }, callback);
            });
        };
        async.series([
            function(list_cb){
                contractor.playlist.list({ fields: 'id', search: option.search }, function(err, playlist){
                    list_cb(err, playlist);
                });
            },
        ], function(err, res){
            var playlist = res[0];
            if(playlist.count == 0)
                remove_cb(err, 'no find playlist');
            else {
                var execute = [];
                for(var i=0; i<playlist.count; i++)
                {
                    eventConsole(playlist.list[i].id, execute);
                }
                async.series(execute, function(err, res){
                    (err)?remove_cb(err, null):remove_cb(null, 'done');
                });
            }
        });
    };
    
    /**
     * Clear Media
     *
     */
    var clearMedia = function( option, clear_cb ){
        // contractor.media.list({ fields: 'id', search: option.search }, clear_cb);
        var eventConsole = function(target, event){
            event.push(function(callback){ 
                contractor.media.remove({ media: { id: target } }, callback);
            });
        };
        async.series([
            function(list_cb){
                contractor.media.list({ fields: 'id', search: option.search }, function(err, media){
                    list_cb(err, media);
                });
            },
        ], function(err, res){
            var media = res[0];
            if(media.count == 0)
                clear_cb(err, 'no find media');
            else {
                var execute = [];
                for(var i=0; i<media.count; i++)
                {
                    eventConsole(media.list[i].id, execute);
                }
                async.series(execute, function(err, res){
                    (err)?clear_cb(err, null):clear_cb(null, 'done');
                });
            }
        });
    };
    
    /**
     * Push event list to all playlist in server.
     * 
     * @param {object} option Input setting of playlist, subplaylist and player.
     *     @param {object} playlist Setting playlist and subplaylist by name.
     *         @param {string} search Find out available playlist.
     *         @param {string} play Find out subplaylist.
     *     @param {object} player Setting player.
     *         @param {string} name Player name.
     * @param {function} reportStatus_cb Report status. i.e. { value: success }
     */
    var pushEvent = function( option, reportPush_cb ){
        //if(!pushFlag) console.log(pushFlag);
        async.series([
            function(callback){
                contractor.playlist.list( { sort: 'id', fields: 'id,name,playlistItems', search: option.playlist.search }, function(err, playlist){
                    callback(null, playlist);
                });
            },
            function(callback){
                contractor.playlist.list( { sort: 'name', limit: 1, fields: 'id,name', search: option.playlist.play }, function(err, playlist){
                    callback(null, playlist);
                });
            },
        ], function(err, result){
            
            var detectFlag = 0;
            var detectType = ['search', 'play'];
            
            var pushTrigger = function(){
                
                var pushSubplaylist = { subplaylist: { id: result[1].list[0].id, name: result[1].list[0].name } };
                
                for(var i=0; i<result[0].count; i++){
                    pushSubplaylist.id = result[0].list[i].id;
                    pushSubplaylist.name = result[0].list[i].name;
                    
                    if(!result[0].list[i].playlistItems){
                        contractor.playlist.pushSubplaylist(pushSubplaylist, function(err, res){});
                    }
                    else {
                        for(var j=0; j<result[0].list[i].playlistItems.length; j++){
                            if(result[0].list[i].playlistItems[j].subplaylist)
                                if(result[0].list[i].playlistItems[j].subplaylist.name == pushSubplaylist.subplaylist.name)
                                    break;
                            if(j == result[0].list[i].playlistItems.length-1)
                                contractor.playlist.pushSubplaylist(pushSubplaylist, function(err, res){});
                        }
                    }
                    
                    if(i == result[0].count-1) {
                        if(!option.player) playerName = 'feltmeng';
                        else playerName = option.player.name;
                        contractor.player.findPlayerIdByName(playerName, function(err, playerId){
                            contractor.player.pushProgram({"ids": [playerId]}, function(res){
                                reportPush_cb(res);
                            });
                        });
                    }
                }
            };
            
            var detect = function(target, type){
                if((typeof(target) === 'undefined')) {
                    reportPush_cb('no find "' + type + '" playlist: no result array');
                    return;
                }
                else if((typeof(target.list) === 'undefined')) {
                    reportPush_cb('no find "' + type + '" playlist: no playlist');
                    return;
                }
                else if((typeof(target.list[0]) === 'undefined')) {
                    reportPush_cb('no find "' + type + '" playlist: no playlist to array');
                    return;
                }
                else {
                    detectFlag++;
                    (detectFlag != 2)?detect(result[detectFlag], detectType[detectFlag]):pushTrigger();
                }
            };
            detect(result[detectFlag], detectType[detectFlag]);
            
        });
    };
    
    return {
        listTimeslot : listTimeslot,
        setItemToPlaylist : setItemToPlaylist,
        pushEvent : pushEvent,
        setWebpageToPlaylist: setWebpageToPlaylist,
        pushMediaToPlaylist: pushMediaToPlaylist,
        uploadMediaItem: uploadMediaItem,
        pullPlaylistItem: pullPlaylistItem,
        clearPlaylistItems: clearPlaylistItems,
        validProgramExpired: validProgramExpired,
        removePlaylist: removePlaylist,
        clearMedia: clearMedia,
        contractor: contractor,   //test
    };
}

module.exports = scalaMgr;
