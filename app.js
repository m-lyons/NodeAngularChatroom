
/**
 * Module dependencies
 */

var flash = require('connect-flash'),
    crypto = require('crypto'),
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    ObjectID = require('mongodb').ObjectID,
    Connection = mongodb.Connection,
    Server = mongodb.Server,
    express = require('express'),
    routes = require('./routes'),
    login = require('./routes/login'),
    register = require('./routes/register'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path'),
    io = require('socket.io').listen(3001),
    ensureLoggedIn = require('connect-ensure-login/lib/ensureLoggedIn'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;

    var users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
    , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com' }
    ];

    var findById = function(id, fn) {
        var user = new Object();
        user.id = id;
        Db.connect('mongodb://localhost:' + Connection.DEFAULT_PORT + '/AngularExpressExample', function (err, db) {
            var collection = db.collection('users');
            collection.find({ '_id': new ObjectID(id)}).nextObject(function (err, doc) {
                if (err) { return fn(null, null) }
                user.salt = doc.salt;
                user.username = doc.username;
                user.role = doc.role;
                collection = db.collection('authentication');
                collection.find({ 'username': user.username }).nextObject(function (err, doc) {
                    if (err) { return fn(null, null) }
                    user.hash = doc.hash;
                    return fn(null, user);
                });
            });
        });
    }

    var findByUsername = function (username, fn) {
        var user = new Object();
        user.username = username;
        Db.connect('mongodb://localhost:' + Connection.DEFAULT_PORT + '/AngularExpressExample', function (err, db) {
            var collection = db.collection('users');
            collection.find({ 'username': username }).nextObject(function (err, doc) {
                if (err) { return fn(null,null) }
                user.salt = doc.salt;
                user.id = doc._id;
                user.role = doc.role;
                collection = db.collection('authentication');
                collection.find({ 'username': username }).nextObject(function (err, doc) {
                    if (err) { return fn(null, null) }
                    user.hash = doc.hash;
                    return fn(null, user);
                });
            });
        });
    }

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

    var createUser = function(username,password,done) {
        var user = { username: username, salt: makeId(), role: 'standard' };
        var hash = getHash(user.salt, password);
        Db.connect('mongodb://localhost:' + Connection.DEFAULT_PORT + '/AngularExpressExample', function (err, db) {
            var collection = db.collection('users');
            collection.insert(user, function (err, result) {
                collection = db.collection('authentication');
                var auth = { username: username, hash: hash };
                collection.insert(auth, function (err, result) {
                    db.close();
                    return done();
                });
            });
        });
    }

    

    

    // Passport session setup.
    //   To support persistent login sessions, Passport needs to be able to
    //   serialize users into and deserialize users out of the session.  Typically,
    //   this will be as simple as storing the user ID when serializing, and finding
    //   the user by ID when deserializing.
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use(new LocalStrategy(
  function (username, password, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {

          // Find the user by username.  If there is no user with the given
          // username, or the password is not correct, set the user to `false` to
          // indicate failure and set a flash message.  Otherwise, return the
          // authenticated `user`.
          findByUsername(username, function (err, user) {
              if (err) { return done(err); }
              if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
              var hash = getHash(user.salt, password);
              if (user.hash != hash) { return done(null, false, { message: 'Invalid password' }); }
              return done(null, user);
          })
      });
  }
));

var app = module.exports = express();


/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());
app.use(express.session({secret: 'secret'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(app.router);


// development only
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
}

// production only
if (app.get('env') === 'production') {
  // TODO
};

var defaultChatRoom = { messages: [], users: [], name: 'default'}
var model = { chatRooms: []};
model.chatRooms[0] = defaultChatRoom;
model.newChatRoom = function(name) {
    model.chatRooms.push({messages: [], users: [], name: name});
};
var clients = [];

// create a chatroom
var createChatRoom = function(req,res) {
    var name = req.body.name;
    model.chatRooms.push({messages: [], users: [], name: name});
    res.json({ name: name });
    var pos = model.chatRooms.length - 1;
    var path = 'chatRooms.' + pos.toString();
    clients.forEach(function(otherClient){
        otherClient.emit("channel", {path: path, value: model.chatRooms[pos]});
    });
};

function set(obj, path, value){
    var lastObj = obj;
    var property;
    path.split('.').forEach(function(name){
        if (name) {
            lastObj = obj;
            obj = obj[property=name];
            if (!obj) {
                lastObj[property] = obj = {};
            }
        }
    });
    lastObj[property] = value;
}

// socket.io
io.sockets.on('connection', function(socket){
    clients.push(socket);
    // new client is here!
    socket.on('channel', function(msg){
        console.log('message:');
        console.log(msg);
        set(model, msg.path, msg.value);
        clients.forEach(function(otherClient){
            if (socket !== otherClient){
                console.log("emitting..");
                otherClient.emit("channel", msg);
            }
        });
    });
    socket.emit('channel',{path: '', value: model});
});


/**
 * Routes
 */

// serve index and view partials
app.get('/', ensureLoggedIn('/login'), routes.index);
//app.get('/', routes.index);
app.get('/login', login.index);
app.get('/register', register.index);
app.post('/register', function (req, res) {
    if (req.body.password == req.body.confirmPassword) {
        createUser(req.body.username, req.body.password, function () {
            findByUsername(req.body.username, function (err, user) {
                req.login(user, function (err) {
                    if (err) { return; }
                    return res.redirect('/');
                });
            });
        });
    }
    else { res.redirect('/register') };
    
});
app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function (req, res) {
      res.redirect('/');
  });
app.get('/logout', ensureLoggedIn('/login'), function (req, res) {
    req.logout();
    res.redirect('/login');
});
app.get('/partials/:name', routes.partials);



// JSON API
app.get('/api/name', api.name);
app.get('/api/user', ensureLoggedIn('/login'), api.user);
app.get('/users/apptest1', ensureLoggedIn('/login'), function(req,res) {
    console.log('accessed apptest1 user page');
});
app.post('/api/command/createchatroom', createChatRoom);

// redirect all others to the index (HTML5 history)
app.get('*', ensureLoggedIn('/login'), routes.index);


/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});



