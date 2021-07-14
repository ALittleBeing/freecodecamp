'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const cors = require('cors')

const session = require('express-session');
const passport = require('passport');
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');

const MongoStore  = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

app.use(cors({credentials: true}))
app.set('view engine', 'pug')

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // to set secure cookie

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
 cookie: { secure: true },
 key: 'connect.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'connect.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

myDB(async client => {
  const myDataBase = await client.db("API").collection("users"); 

  let currentUsers = 0; 

  io.on('connection', socket => {
    ++currentUsers;
  io.emit('user', {
  name: socket.request.user.username,
  currentUsers,
  connected: true
});
  //console.log('A user has connected');
  console.log('user ' + socket.request.user.username + ' connected');

  //emit when message arrives
  socket.on('chat message', message => {
  io.emit('chat message', {name: socket.request.user.username,message});
});

  //when user disconnects
  socket.on('disconnect', () => {
  /*anything you want to do on disconnect*/
  --currentUsers;
  io.emit('user', {
  name: socket.request.user.username,
  currentUsers,
  connected: false
});
  //console.log('A user has disconnected');
  console.log('user ' + socket.request.user.username + ' disconnected');

});



});
  routes(app, myDataBase);
  auth(app, myDataBase);

  
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'unable to login' });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}


const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
