/**
 * Constants
 */

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = '27017';

/**
 * Module dependencies
 */

var flash = require('connect-flash'),
    crypto = require('crypto'),
    UserDao = require('./data_access').UserDao,
    MessageDao = require('./data_access').MessageDao,
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

var userDao = new UserDao(DEFAULT_HOST,DEFAULT_PORT);

 

var getHash = function(salt, pwd) {
    return crypto.createHash('md5').update(salt + pwd).digest('hex');
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
    userDao.findById(id, function (err, user) {
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
          userDao.findByUsername(username, function (err, user) {
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

var model = { chatRooms : [] };

var messageDao = new MessageDao(DEFAULT_HOST,DEFAULT_PORT,function() {
    messageDao.initialLoad(function(error,chatrooms) {
        if (error) {
            console.log('Failed initial load');
        } else if(chatrooms.length == 0) {
            console.log('Created Default Chatroom');
            var defaultChatRoom = { messages: [], users: [], name: 'default'}
            model.chatRooms[0] = defaultChatRoom;
            messageDao.createChatroom('default',function(){});
        } else {
            console.log('initial load');
            model.chatRooms = chatrooms;
        }
    });
}); 




var clients = [];

// create a chatroom
var createChatRoom = function(req,res) {
    var name = req.body.name;
    model.chatRooms.push({messages: [], users: [], name: name});
    messageDao.createChatroom(name,function(){});
    res.json({ name: name });
    clients.forEach(function(otherClient){
        otherClient.emit("chatroom", { name: name });
    });
};

var last = function(num,array) {
    var result = [];
    if (num <= 0) return result;
    if (array.length < num) return array;
    var length = array.length;
    for (var i = length - 1 - num; i < array.length; i++ ) {
        result.push(array[i]);
    }
    return result;
}

var loadNewClient = function() {
    var chatRooms = [];
    model.chatRooms.forEach(function(chatroom) {
        chatRooms.push( { messages: last(10,chatroom.messages), users: chatroom.users, name: chatroom.name } );
    });
    return chatRooms;
};

// socket.io
io.sockets.on('connection', function(socket){
    clients.push(socket);
    // new client is here!
    socket.on('message', function(msg){
        console.log('message:');
        console.log(msg);
        //set(model, msg.path, msg.value);
        model.chatRooms[msg.chatroom].messages.push(msg.message);
        clients.forEach(function(otherClient){
            if (socket !== otherClient){
                console.log('emitting..');
                otherClient.emit('message', msg);
            }
        });
    });
    socket.emit('initialize',{chatRooms: loadNewClient()});
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
        userDao.createUser(req.body.username, req.body.password, function () {
            userDao.findByUsername(req.body.username, function (err, user) {
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



