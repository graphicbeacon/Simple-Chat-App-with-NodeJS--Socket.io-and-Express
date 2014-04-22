
/**
 * Module dependencies.
 */

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var handler = require('./handler');
var port = 1337;

// Sets up express static server directory to the /public folder
app.use(express.static(__dirname + '/public'));

// Holds an array of users connected
var nicknames = [];

io.sockets.on('connection', function(socket) {

    // When user enters name from the client
	socket.on('new user', function(data) {

		var nicknameTaken;

        // Ensure submitted username doesn't already exist
		// Case insensitive checking
		nicknames.forEach(function(name){
			if ( name.toLowerCase() === data.nickname.toLowerCase() ) {
                nicknameTaken = true; // Set nicknameTaken to true if name already exists
				return;
			}
		});

		if ( nicknameTaken ) {
            // Send notification to client that username already exists
			socket.emit('nickname taken');

		} else {
            // Or else create new username
			socket.set("nickname", data.nickname, function() {

				// Update 'nicknames' array
				nicknames.push(data.nickname);

                // Welcome the user who joined
				socket.emit('welcome', data.nickname, nicknames);

                // Broadcast to other clients that a user has joined
				socket.broadcast.emit('user joined', data.nickname, nicknames);
			});

		}
		
	});

    // Listening for chat messages being sent
	socket.on('outgoing', function(data) {

		socket.get('nickname', function(err,nickname) {
			var eventArgs = {
				nickname: nickname,
				message: data.message
			};

            // You can either use the code below
            // to send messages to all clients...
			//io.sockets.emit('incoming', nameAndData, null);

            // ...Or you can use these lines for better flexibility
			socket.emit('incoming', eventArgs, true);
			socket.broadcast.emit('incoming', eventArgs, false);
		});
	});

    // Listening for when someone leaves - native listener for socket.io
	socket.on('disconnect', function(){

		socket.get('nickname', function(err, nickname){

			// Remove username from users
			nicknames.splice( nicknames.indexOf(nickname), 1 );

            // Don't need to broadcast if there are no users left
			if(nicknames.length === 0) return;

            // Notify existing users that someone left
			socket.broadcast.emit('user left', nickname, nicknames);
		});
		
		console.log('user disconnected!');
	});
});


server.listen(port, function() { console.log("Server listening at http://localhost:"+port)});

// ExpressJS routes using the 'get' verb
app.get('/', handler);