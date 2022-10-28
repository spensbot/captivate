#!/usr/bin/env node

const http = require('http');
const { Server } = require('socket.io');
const ioc = require('socket.io-client');
const app = require('../app');

// Normalize a port into a number, string, or false.
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (Number.isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// Get port from environment and store in Express.
const port = normalizePort(process.env.PORT || '7777');
app.set('port', port);

// Create the HTTP server
const server = http.createServer(app);

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`); // eslint-disable-line no-console
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`); // eslint-disable-line no-console
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`Listening on ${bind}`); // eslint-disable-line no-console
}

const socketServer = http.createServer();

global.io = new Server(socketServer, {
  cors: {
    origin: '*',
  },
  pingInterval: 1000 * 60 * 5,
  pingTimeout: 300000,
});

io.on('connection', (socket) => {
  console.log('user connected', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('user disconnected', reason);
  });
  socket.onAny((event, data) => {
    io.sockets.emit(event, data);
  });
});

socketServer.listen(3001);

global.socketClient = ioc('http://localhost:3001');

server.listen(7777);
server.on('error', onError);
server.on('listening', onListening);
