import { Server } from "socket.io";
import { v4 } from "uuid";

interface Player {
  id: string;
  paddlePosition: number;
}

interface Room {
  id: string; // Unique identifier for the room
  ballPosition: number; // Probably need to update to x and y coordinate or something,
  players: Player[]; // Max 2
}

let filledRooms: Room[] = [];
let halfFilledRooms: Room[] = [];

export function setupSockets(io: Server) {
  // Handle a new client connection
  io.on("connection", (socket) => {
    // Handle player joining a game room
    socket.on("joinGame", () => {
      // First check whether there's a half filled room
      if (halfFilledRooms.length > 0) {
        // Populate the half filled room and the game is ready to play
        const halfFilledRoom = halfFilledRooms.find(
          (x) => x.players.length === 1,
        );

        if (halfFilledRoom) {
          const existingPlayer = halfFilledRoom.players[0];
          const newPlayer: Player = {
            id: v4(),
            paddlePosition: 0,
          };

          filledRooms.push({
            id: v4(),
            ballPosition: 0,
            players: [existingPlayer, newPlayer],
          });

          // Remove the filled room from the half filledrooms
          halfFilledRooms = halfFilledRooms.filter(
            (x) => x.id !== halfFilledRoom.id,
          );

          // Join the room
          socket.join(halfFilledRoom.id);

          socket.emit("gameFound", { roomId: halfFilledRoom.id });

          return;
        }
      }

      halfFilledRooms.push({
        id: v4(),
        ballPosition: 0, // ToDo not sure what this should be
        players: [
          {
            id: socket.id,
            paddlePosition: 0,
          },
        ],
      });

      socket.emit("waitingForPlayer");
    });

    // Handle paddle movement sent by a player
    socket.on(
      "movePaddle",
      ({ position, roomId }: { position: number; roomId: string }) => {
        // Find the player's room
        const playerRoom = filledRooms.find((x) => x.id === roomId);

        if (playerRoom) {
          // Update the player's paddle position

          const player = playerRoom.players.find((x) => x.id === roomId);
          if (player) {
            player.paddlePosition = position;

            // Broadcast the updated paddle position to all players in the room
            io.to(playerRoom.id).emit("updatePaddle", {
              playerId: socket.id,
              position,
            });
          }
        }
      },
    );

    // Handle player disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`); // Log the disconnection

      const roomContainingPlayer = filledRooms.find((x) =>
        x.players.some((xx) => xx.id === socket.id),
      );

      if (!roomContainingPlayer) {
        return; // We can't find the room for the player, we're wasting out time
      }

      filledRooms.map((room) => {
        if (room.id == roomContainingPlayer.id) {
          room.players = room.players.filter((x) => x.id !== socket.id);
        }

        return room;
      });
    });
  });
}
