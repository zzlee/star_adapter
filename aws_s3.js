
var FM = {};

FM.AWSS3 = (function(){
    var fs = require('fs');
    var uInstance = null;

    var S3_KEY = 'AKIAIGODK62AFWNIHQ6Q',
    S3_SECRET = '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';
    S3_BUCKET = 'miix_content';//default

    var s3Client = require('knox').createClient({
    	
        key: S3_KEY,
        secret: S3_SECRET,
        bucket: S3_BUCKET
    });

    function constructor(){
        return {

            /**
             *  Connect Aws S3 Bucket
             */
            connectAwsS3Bucket : function(bucket){
                s3Client = require('knox').createClient({
                    key: S3_KEY,
                    secret: S3_SECRET,
                    bucket: bucket
                });
            },

            /**
             *  List Aws S3 Object
             */
            listAwsS3 : function(str,cb){
                s3Client.list({ prefix: str }, function(err, result){
                    if (err) cb(err, null);
                    else cb(null, result);
                });
            },

            /**
             *  Upload Photo To Aws S3.
             */
            uploadToAwsS3 : function(obj, awsKey, contentType, cb){
                if (!contentType){
                    contentType = 'image/jpeg';
//                	contentType = 'video/mp4';
                }
                
                /**
                 * Save file to S3 and make public link 
                 * x-amz-acl : public-read
                 * 
                 * by Jean
                 */
                var header = {
                		'Content-Type' : contentType,
                		'x-amz-acl' : "public-read"
                };
                s3Client.putFile(obj, awsKey, header, function(err, result){
                    if (err) {
                        if (cb) {
                            cb(err, null);
                        }
                    }
                    else {
                        if (cb) {
                            cb(null, "Uploaded Successful");
                        }
                    }
                });
            },

            /**
             *  Download Photo From Aws S3.
             */
            downloadFromAwsS3 : function(obj,awsKey,cb){
                var file = fs.createWriteStream(obj);
                s3Client.getFile(awsKey, function(err, res) {
                    res.on('data', function(data) { file.write(data); });
                    res.on('end', function(chunk) { 
                        file.end(); 
                        if (cb) {
                            cb(null, "Download Successful");
                        }
                    });

                    if (err) {
                        if (cb) cb(err, null);
                    }
                    
                });
            },
            
            /**
             *  Delete Photo From Aws S3.
             */
            deleteAwsS3 : function(obj,cb){
                s3Client.deleteFile(obj, function(err, res){
                    if (cb) {
                        cb(null, "Delete Successful");
                    }

                    if (err) {
                        if (cb) cb(err, null);
                    }
                  });
            },
            
            /**
             *  Copy File To Other Path On Aws S3.
             */
            copyToAwsS3 : function(source, dest, copy_cb){
                
                if(source[0] != '/') source = '/' + source;
                if(dest[0] != '/') dest = '/' + dest;
                
                s3Client.copyFile(source, dest, function(err, res){
                    if (copy_cb) {
                        copy_cb(null, "Copy Successful");
                    }

                    if (err) {
                        if (copy_cb) copy_cb(err, null);
                    }
                });
            },
            
            /**
             *  Update File ACLs From Aws S3.
             */
            updateFileACLAwsS3 : function(file, acl, update_cb){
                
                if(file[0] != '/') file = '/' + file;
                if(typeof(acl) === 'function') {
                    update_cb = acl;
                    acl = 'public-read';
                }
                
                s3Client.request('PUT', file + '?acl', { 'x-amz-acl': acl }).on('response', function(res){
                    if ((res.statusCode <= 250) && (res.statusCode >= 200)) {
                        if (update_cb) update_cb(null, "Update Successful");
                    }
                    else {
                        if (update_cb) update_cb('request error: http status code is ' + res.statusCode, null);
                    }
                }).end();
            },
            
            /**
             *  Delete Multiple file From Aws S3.
             */
            deleteMultipleFileAwsS3 : function( fileset, delete_cb ){
                
                for(var i=0; i<fileset.length; i++)
                    if(fileset[i][0] != '/') fileset[i] = '/' + fileset[i];
                
                s3Client.deleteMultiple( fileset, function(err, res){
                    if (delete_cb) {
                        if (err) 
                            delete_cb(err, null);
                        else
                            delete_cb(null, "Delete Successful");
                    }
                } );
            },
            
            _test: function(){
                this.deleteAwsS3('testfolder/test_upload.jpg', function(err, result){
                    console.log('deleteAwsS3'+err+result);
                });
            },
            _test_list: function(){
                this.listAwsS3('user_project/test', function(err, result){
                    console.log('listAwsS3'+err+result);
                    if(result) {
//                        console.dir(result);
                        console.log(result.Contents[0].Key);
                    }
                });
            }


        };//   End return

    }//   End constructor

    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            return uInstance;
        }
    }; //   End of Return uInstance.


})();

//FM.AWSS3.getInstance()._test_list();

module.exports = FM.AWSS3.getInstance();
