/*
 * Login to server and get module function.
 * 
 * constructor
 * param {string} url The server URL.
 * param {string} username The account to login.
 * param {string} password The password to login.
 * return {function} listTimeslot List timeslots from server.
 * return {function} setItemToEvent Set item in timeslot to server.
**/

/**
 * The manager who handles interfacing Scala Enterprise
 *
 * @mixin
 */
var scalaMgr = require('./connect_t.js');

scalaMgr.connectServer({
    url: 'http://server-pc:8080',
    username: 'administrator',
    password: '53768608'
});

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
scalaMgr.listTimeslot = function(name, channel, frame, startDate, endDate, timeslot_cb){
    
};

/**
 * Add item in timeslot to server.
 * 
 * @param {object} item The item upload to scala server.
 *     @param {string} path The path is file path.
 *     @param {string} filename The filename is file title.
 * @param {string} playTime The playTime is program play to DOOH in specific time.
 * @param {function} reportStatus_cb Report media id and playlistItem id in playlist.
 */
scalaMgr.addItemToEvent = function(item, playTime, reportStatus_cb){
    
};

/**
 * Push event list to all playlist in server.
 * 
 * @param {function} reportStatus_cb Report status. i.e. { value: success }
 */
scalaMgr.pushEvent = function(reportPush_cb){
    
};