import { Server } from "socket.io";

interface Player {
  id: string;
  room: string;
  paddlePosition: number;
}

const rooms: Record<string, Player[]> = {};

export function setupSockets(io: Server) {
  // Handle a new client connection
  io.on("connection", (socket) => {
    // Handle player joining a game room
    socket.on("joinGame", (room: string) => {
      // If the room doesn't exist, create it
      if (!rooms[room]) {
        rooms[room] = [];
      }

      // Check if we have space for another player in the room
      if (rooms[room].length < 2) {
        rooms[room].push({
          id: socket.id,
          room,
          paddlePosition: 50,
        });
      }
    });
  });
}
