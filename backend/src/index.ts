import http from "http";
import { Server } from "socket.io";
import { setupSockets } from "./sockets";
import express from "express";

// The express application which allows us to configure routes etc
const app = express();

// The actual server which will listen for incoming requests
const server = http.createServer(app);

// Create a socket IO server instance
const io = new Server(server, {
  cors: {
    origin: "*", // TODO update, For live
  },
});

// Set up our sockets for our game
setupSockets(io);

// Handle request to the homepage to prove the server is running
app.get("/", (req: any, res: any) => {
  res.send("Paddle game backend is running!");
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
