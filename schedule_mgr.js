/**
 * @fileoverview Implementation of scheduleMgr
 */


var async = require('async');
var mongoose = require('mongoose');
var workingPath = process.cwd();
var path = require('path');
var fs = require('fs');
var awsS3 = require('./aws_s3.js');
var db = require('./db.js');
var scalaMgr = (require('./scala/scalaMgr.js'))( systemConfig.HOST_SCALA_URL , { username: systemConfig.HOST_SCALA_USER_NAME, password: systemConfig.HOST_SCALA_PASSWORD } );
var scalaPlayerName = systemConfig.HOST_SCALA_PLAYER_NAME;

var sessionItemModel = db.getDocModel("sessionItem");
var programTimeSlotModel = db.getDocModel("programTimeSlot");

var scheduleMgr = {};

var flag = 0;

var autoPushProgramToPlayer = function(){
    var timeInfos;
    var intervalStart;
    var intervalEnd;
    var straceStamp;
    var sessionId;
    
    //push each programs to Scala
    var iteratorPushAProgram = function(aProgram, callbackIterator){
        
        if (aProgram.contentType == "file" ) {
            
            async.waterfall([
                function(callback){
                    //download contents from S3 or get from local
                    //var fileName;
                    if (aProgram.type == "UGC"){
                       if((aProgram.content.fileExtension == 'png')||(aProgram.content.fileExtension == 'jpg')){
                            var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.'+aProgram.content.fileExtension; 
                            //TODO: make sure that target directory exists
                            var targetLocalPath = path.join(workingPath, 'public/contents/temp', aProgram.content.projectId+'.'+aProgram.content.fileExtension);
                        }
                        else{
                            var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.'+aProgram.content.fileExtension; 
                            //TODO: make sure that target directory exists
                            if(typeof(aProgram.content.fileExtension) === 'undefined') {  //TODO: find out the bug, and remove this check
                                //aProgram.content.fileExtension = '.mp4';
                                var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.mp4';
                                var targetLocalPath = path.join(workingPath, 'public/contents/temp', aProgram.content.projectId+'.mp4');
                            }
                            else {
                                var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.'+aProgram.content.fileExtension;
                                var targetLocalPath = path.join(workingPath, 'public/contents/temp', aProgram.content.projectId+'.'+aProgram.content.fileExtension);                                        
                            }
                        }
                        awsS3.downloadFromAwsS3(targetLocalPath, s3Path, function(errS3,resultS3){
                            if (!errS3){
                                logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully download from S3 ' + s3Path );
                                //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully download from S3 ' + s3Path );
                                callback(null, targetLocalPath, aProgram.timeslot, aProgram.content.no);
                            }
                            else{
                                logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Failed to download from S3 ' + s3Path);
                                //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Failed to download from S3 ' + s3Path);
                                callback('Failed to download from S3 '+s3Path+' :'+errS3, null, null, null);
                            }
                            
                        });
                 /*       //add fb push
                        postPreview(aProgram, function(err, res){
                            if(err)
                                logger.info('Post FB message is Error: ' + err);
                            else
                                logger.info('Post FB message is Success: ' + res);
                        });*/
                    }
                    else {
                        var paddingFilePath = path.join(workingPath, 'public', aProgram.content.dir, aProgram.content.file);
                        callback(null, paddingFilePath, aProgram.timeslot, aProgram.content.no);
                    }

                }, 
                function(fileToPlay, timeslot, contentNo, callback){
                    //debugger;
                    //push content to Scala
                    var option = 
                    {
                        playlist: { name: 'OnDaScreen'},
                        playTime: {
                            start: timeslot.start,
                            end: timeslot.end,
                            duration: timeslot.playDuration/1000  //sec    
                        },
                        file: {
                            name : path.basename(fileToPlay),
                            path : path.dirname(fileToPlay),
                            savepath : ''
                        }
                    };
                    scalaMgr.setItemToPlaylist( option, function(errScala, resultScala){
                        if (!errScala){
                            logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + fileToPlay );
//                            adminBrowserMgr.showTrace(null, straceStamp+"成功推送編號"+contentNo+"的UGC至播放系統!");
                            //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + fileToPlay );
                            callback(null, fileToPlay);
                        }
                        else{
                            logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + fileToPlay );
//                            adminBrowserMgr.showTrace(null, straceStamp+"!!!!!無法推送"+contentNo+"的UGC至播放系統!");
                            //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + fileToPlay );
                            callback('Failed to push content to Scala :'+errScala, null);
                        }
                    });
                    
                    //callback(null, fileToPlay);
                },
                function(filePlayed, callback){
                    //TODO: delete downloaded contents from local drive
                    callback(null,'done');
                }, 
            ], function (errWaterfall, resultWaterfall) {
                // result now equals 'done'
                if(!errWaterfall){
                    db.updateAdoc(programTimeSlotModel, aProgram._id, {"upload": true}, function(err, res){
//                        console.log(err, res);
                        callbackIterator(errWaterfall);
                    });
                }else
                    callbackIterator(errWaterfall);
            });
            
        }
        else if (aProgram.contentType == "web_page" ){
            //contentType is "web_page"
            
            if (aProgram.content.uri){
                
                var option = 
                {
                    playlist: { name: 'OnDaScreen'},
                    playTime: {
                        start: aProgram.timeslot.start,
                        end: aProgram.timeslot.end,
                        duration: aProgram.timeslot.playDuration/1000  //sec    
                    },
                    webpage: { name: aProgram.content.name , uri: aProgram.content.uri }
                };
                scalaMgr.setWebpageToPlaylist(option, function(errScala, resultScala){
                    if (!errScala){
                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + aProgram.content.uri );
//                        adminBrowserMgr.showTrace(null, straceStamp+"成功推送"+aProgram.content.uri+"至播放系統!");
                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + web.uri );
                        db.updateAdoc(programTimeSlotModel, aProgram._id, {"upload": true}, function(err, res){
//                            console.log(err, res);
                            callbackIterator(null);
                        });
                    }
                    else{
                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + aProgram.content.uri );
//                        adminBrowserMgr.showTrace(null, "!!!!!無法推送"+aProgram.content.uri+"至播放系統.");
                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + web.uri );
                        callbackIterator('Failed to push content to Scala :'+errScala);
                    }
                });
            }
            
            //callbackIterator(null);
        }
        else {
            //contentType is "media_item"
            if (aProgram.content.name){
                var setting = {
                    media: { name: aProgram.content.name },
                    playlist:{ name: 'OnDaScreen'},
                    playTime: { start: aProgram.timeslot.start, end: aProgram.timeslot.end, duration: aProgram.timeslot.playDuration/1000 }
                };
                
                scalaMgr.pushMediaToPlaylist(setting, function(errScala, res){
                    if (!errScala){
                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + aProgram.content.name );
                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + aProgram.content.name );
//                        adminBrowserMgr.showTrace(null, straceStamp+"成功推送"+aProgram.content.name+"至播放系統!");
                        db.updateAdoc(programTimeSlotModel, aProgram._id, {"upload": true}, function(err, res){
//                            console.log(err, res);
                            callbackIterator(null);
                        });
                    }
                    else{
                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + aProgram.content.name );
                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + aProgram.content.name );
//                        adminBrowserMgr.showTrace(null, straceStamp+"!!!!!無法推送"+aProgram.content.name+"至播放系統!");
                        callbackIterator('Failed to push content to Scala :'+errScala);
                    }
                });
                
            }
        }
        
    };
    
    async.waterfall([
                     function(cb1){
                         var checkDateStart = new Date().getTime();
                         var checkDateEnd = checkDateStart + 30*60*1000;
                         straceStamp = "現在時間"+new Date().toDateString()+' '+new Date().toLocaleTimeString();
                         
                         //query the programs of this specific session
                         programTimeSlotModel.find({"timeslot.start": {$gte: checkDateStart, $lte: checkDateEnd}, "upload":false, "state": "confirmed"}).sort({"timeStamp":1}).exec(function (err1, _programs) {
                             if(!_programs){
                                 logger.info("[schedule_mgr]no matched programTimeSlot");
                                 cb1("沒有節目準備上傳", null);
                             }
                             else if(!_programs[0]){
                                 logger.info("[schedule_mgr]no matched programTimeSlot");
                                 cb1("沒有節目準備上傳", null);
                             }
                             else if (!err1) {
//                                 console.log(_programs);
                                 var programs = JSON.parse(JSON.stringify(_programs));
                                 sessionId = _programs[0].session;
                                 timeInfos = sessionId.split('-');
                                 intervalStart = new Date( Number(timeInfos[2]) );
                                 intervalEnd = new Date( Number(timeInfos[3]) );
                                 straceStamp = '[推送'+intervalStart.toDateString()+' '+intervalStart.toLocaleTimeString()+'~'+intervalEnd.toDateString()+' '+intervalEnd.toLocaleTimeString()+'的節目] ';
//                                 adminBrowserMgr.showTrace(null, straceStamp+"節目推送作業開始....");
                                 
                                 //for debugging
                                 logger.info('[scheduleMgr] programs to push (to 3rd-party Content Manager:' );
                                 for (var i in programs){
                                     logger.info(JSON.stringify(programs[i]));
                                 }
                                                    
                                 cb1(null, programs);
                             }
                             else {
                                 cb1('Failed to query the programs of a specific session: '+err1, null);
                             }                             
                         });
                     },
                     function(programs, cb3){
                         async.eachSeries(programs, iteratorPushAProgram, function(errEachSeries){
                             cb3(errEachSeries, programs);
                         });
                         
                     },
                     function(programs, cb4){
                         scalaMgr.pushEvent( {playlist: {search:'FM', play:'OnDaScreen'}, player: {name: scalaPlayerName}}, function(res){
                             logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]scalaMgr.pushEvent res="+res);
                             cb4(null, res);
                         });
                     }
     ], function (err, result) {
        if (!err) {
//            adminBrowserMgr.showTrace(null, straceStamp+"節目推送完成!");
            logger.info( straceStamp+"節目推送完成!");
        }
        else {
//            adminBrowserMgr.showTrace(null, straceStamp+"!!!節目推送失敗: "+err);
            logger.info( straceStamp+"!!!節目推送失敗: "+err);
        }
    });

};

var autoCheckProgramAndPushToPlayer = function(){

    if(flag == 1){
        //validProgramExpired
        var option =
        {
                search: "OnDaScreen"
        };
		logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer] validProgramExpired start");
        scalaMgr.validProgramExpired(option, function(err, res){
            if(!err){
                logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer] scalaMgr.validProgramExpired "+res);
            }else{
                logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer error]scalaMgr.validProgramExpired "+err);
            }
        });
    }
    else if(flag === 0){
        async.series([
                      function(callback1){
                          //pushEvent
             /*             var checkDateStart = new Date().getTime();
                          var checkDateEnd = checkDateStart + 40*60*1000;
                          logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]find sessionItemModel in checkDateStart:"+checkDateStart+",checkDateEnd:"+checkDateEnd);
                          sessionItemModel.find({'intervalOfPlanningDoohProgrames.start': {$gte: checkDateStart, $lt: checkDateEnd}}).exec(function(err, result){
                              callback1(null);
                              if(!result){
                                  logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]sessionItem is null");
                              }
                              else if(!result[0]){
                                  logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]sessionItem is null");
                              }
                              else if(!err){
                                  logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer.scalaMgr.pushEvent]pushEvent start; play name = OnDaScreen"+'-'+result[0].intervalOfPlanningDoohProgrames.start+'-'+result[0].intervalOfPlanningDoohProgrames.end);
                                  scalaMgr.pushEvent( {playlist: {search:'FM', play:'OnDaScreen'+'-'+result[0].intervalOfPlanningDoohProgrames.start+'-'+result[0].intervalOfPlanningDoohProgrames.end}, player: {name: scalaPlayerName}}, function(res){
                                      logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]scalaMgr.pushEvent res="+res);
                  
                                  });
                              }else{
                                  logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]fail to get sessionItem err="+err);
                              }
                              //console.log(err, result);
                          });*/
                          callback1(null);
                      },
                      function(callback2){
                        //Push program to scala
                          autoPushProgramToPlayer();
                          callback2(null);
                      }
                      ],
                      function(err, results){
                            if(!err)
                                logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]push event results "+results);
                            else
                                logger.info("[schedule_mgr.autoCheckProgramAndPushToPlayer]push event error "+err);
            
                      });

    }
    //flag contorl
    if(flag === 0)
        flag = 1;
    else
        flag = 0;
//    console.log('flag'+flag);
    setTimeout(autoCheckProgramAndPushToPlayer, 6*60*1000);

};
//delay time for scala connect
setTimeout(autoCheckProgramAndPushToPlayer, 2000);




module.exports = scheduleMgr;