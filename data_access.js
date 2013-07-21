var Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	ObjectID = require('mongodb').ObjectID,
	crypto = require('crypto');

var getHash = function(salt, pwd) {
    return crypto.createHash('md5').update(salt + pwd).digest('hex');
}

var makeId = function() {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

    for (var i = 0; i < 12; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

var UserDao = function(host,port) {
	this.db = new Db('NodeAngularChatroom', new Server(host, port, {auto_reconnect: true}, {}), {safe:true});
	this.db.open(function(){})
};

UserDao.prototype.getUsersCollection= function(callback) {
  this.db.collection('users', function(error, collection) {
    if( error ) callback(error);
    else callback(null, collection);
  });
};

UserDao.prototype.getAuthCollection= function(callback) {
  this.db.collection('authentication', function(error, collection) {
    if( error ) callback(error);
    else callback(null, collection);
  });
};

UserDao.prototype.findById = function(id,callback) {
	var _this = this;
	var user = new Object();
	user.id = id;
	this.getUsersCollection( function(error,collection) {
		if (error)
			callback(error);
		else
			collection.find({ '_id': new ObjectID(id)}).nextObject(function (error, doc) {
	            if (error) 
	            	callback(error);
	            else {
		            user.salt = doc.salt;
		            user.username = doc.username;
		            user.role = doc.role;
		            _this.getAuthCollection( function(error,collection) {
		            	if (error)
		            		callback(error);
		            	else {
		            		collection.find({ 'username': user.username }).nextObject(function (error, doc) {
			                    if (error)
			                    	callback(error);
			                    else {
			                    	user.hash = doc.hash;
			                    	callback(null, user);
			                    }
			                });
		            	}
		            });
	        	}
	        });
	});
};

UserDao.prototype.findByUsername = function(name,callback) {
	var _this = this;
	console.log(name);
	var user = new Object();
	user.username = name;
	this.getUsersCollection( function(error,collection) {
		if (error)
			callback(error);
		else
			collection.find({ 'username': name}).nextObject(function (error, doc) {
	            if (error) 
	            	callback(error);
	            else {
		            user.salt = doc.salt;
		            user.id = doc._id;
		            user.role = doc.role;
		            _this.getAuthCollection( function(error,collection) {
		            	if (error)
		            		callback(error);
		            	else {
		            		collection.find({ 'username': name }).nextObject(function (error, doc) {
			                    if (error)
			                    	callback(error);
			                    else {
			                    	user.hash = doc.hash;
			                    	callback(null, user);
			                    }
			                });
		            	}
		            });
	        	}
	        });
	});
};

UserDao.prototype.createUser = function(username,password,callback) {
	var _this = this;
	var user = { username: username, salt: makeId(), role: 'standard' };
    var hash = getHash(user.salt, password);
    var auth = { username: username, hash: hash };
    this.getUsersCollection( function(error,collection) {
		if (error)
			callback(error);
		else
			collection.insert(user, function (error, result) {
	            if (error) 
	            	callback(error);
	            else 
		            _this.getAuthCollection( function(error,collection) {
		            	if (error)
		            		callback(error);
		            	else 
		            		collection.insert(auth, function (error, result) {
			                    if (error)
			                    	callback(error);
			                    else
			                    	callback();
			                });
		            });
	        	
	        });
	});
};

var MessageDao = function(host,port,callback) {
	this.db = new Db('NodeAngularChatroom', new Server(host,port,{auto_reconnect: true},{}), {safe:true});
	this.db.open(callback);
};

MessageDao.prototype.getCollection= function(callback) {
  this.db.collection('messages', function(error, collection) {
    if( error ) callback(error);
    else callback(null, collection);
  });
};

MessageDao.prototype.getChatroomCollection = function(callback) {
	this.db.collection('chatrooms', function(error, collection) {
    	if( error ) callback(error);
   	 	else callback(null, collection);
  	});
};

MessageDao.prototype.findById = function(id,callback) {
	this.getCollection( function(error,collection) {
		if (error) 
			callback(error);
		else
			collection.find({ '_id': new ObjectID(id)}).nextObject(function (error, doc) {
				if (error)
					callback(error);
				else 
					callback(null,doc.message);
			});
	});
};

MessageDao.prototype.insertMessage = function(message,chatroomId,callback) {
	this.getCollection( function(error,collection) {
		if (error) 
			callback(error);
		else {
			var msg = { message : message, chatroomId : chatroomId};
			collection.insert(msg, function(error,result) {
				if (error)
					callback(error);
				else
					callback();
			})
		}
			
	});
};

MessageDao.prototype.getMessages = function(chatroomId, limit, callback) {
	this.getCollection( function(error,collection) {
		if (error) 
			callback(error);
		else {
			var messages = [];
			collection.find({ chatroomId : chatroomId }).toArray(function(error,messageArray) {
				if (error)
					callback(error);
				else {
					messageArray.forEach(function(message) {
						messages.push(message.message);
					});
					callback(null, messages);
				}
			});
		}
			
	});
};

MessageDao.prototype.initialLoad = function(callback) {
	console.log('IL called');
	var _this = this;
	var chatRooms = [];
	this.getChatroomCollection(function(error,collection) {
		console.log('IL chatroomCollection');
		if (error)
			callback(error);
		else
			collection.find().toArray(function(error,chatrooms) {
				console.log('IL found chatrooms');
				if (error)
					callback(error);
				else {
					chatrooms.forEach(function(chatroom){
						chatRooms.push({messages : [], users: [], name: chatroom.chatroomId });
					});
					console.log('IL built chatrooms');
					var errorFlag = false;
					chatRooms.forEach(function(chatroom) {
						_this.getCollection(function(error,collection) {
							console.log('IL got message collection');
							if (error) {
								if (!errorFlag) {
									errorFlag = true;
									callback(error);
								}
							}
							else {
								collection.find({ chatroomId : chatroom.name }).sort({$natural:-1}).limit(10).toArray(function(error,messages) {
									for (var i = messages.length - 1; i >= 0; i--) {
										chatroom.messages.push(messages[i].message);
									};
								});
							}
						});
					});
					if (!errorFlag)
						callback(null,chatRooms);
				}
			});
	});

};

MessageDao.prototype.createChatroom = function(chatroomId,callback) {
	var chatroom = { chatroomId : chatroomId };
	this.getChatroomCollection(function(error,collection) {
		if (error)
			callback(error);
		else
			collection.insert(chatroom, function(error,result) {
				if (error)
					callback(error);
				else
					callback();
			});
	});
};

module.exports.UserDao = UserDao;
module.exports.MessageDao = MessageDao;