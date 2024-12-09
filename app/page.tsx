"use client";

import {
  Application,
  Assets,
  ContainerChild,
  Graphics,
  Renderer,
  Sprite,
} from "pixi.js";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";

export default function Home() {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const leftPaddleRef = useRef<Graphics | null>(null);
  const rightPaddleRef = useRef<Graphics | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const paddleHeight = 200;
  const paddleWidth = 20;
  const canvasWidth = 1000;
  const paddlePadding = 10;
  const paddleSpeed = 5;
  let acceleration = 1;
  const socketRef = useRef<Socket | null>(null); // WebSocket connection referen
  const roomIdRef = useRef(null);

  useEffect(() => {
    const func = async () => {
      if (pixiContainerRef.current && !appRef.current) {
        const app = new Application();
        await app.init({
          width: canvasWidth,
          height: 600,
          backgroundColor: "000000",
          resolution: window.devicePixelRatio || 1,
        });

        appRef.current = app;

        pixiContainerRef.current.appendChild(app.canvas);

        // initialise web socket
        const socket = io("http://localhost:4444");
        socketRef.current = socket; // ToDo what is the purpose of this, are we needing to use it?

        socket.on("connect", () => {
          socket.emit("joinGame");
        });

        socket.on("gameFound", (args) => {
          toast("game found with room id:", args.roomId);
          roomIdRef.current = args.roomId;
        });

        socket.on("waitingForPlayer", (args) => {
          toast("waiting for another player, your patience is appreciated");
        });

        socket.on(
          "updatePaddle",
          ({ position, playerId }: { position: number; playerId: string }) => {
            // We need to update the paddle
            if (playerId == socket.id) {
              // We are now dealing with our own user
            } else {
              // We are dealing with the other user
            }
          },
        );

        // Type guard to check if a ContainerChild is a Sprite
        function isSprite(child: ContainerChild): child is Sprite {
          return child instanceof Sprite;
        }

        socket.on("updateBall", ({ x, y }) => {
          // update the ball's position
          if (app.stage.children.some(isSprite)) {
            const bunny = app.stage.children.find(
              (child) => child instanceof Sprite,
            ) as Sprite;
            if (bunny) {
              bunny.x = x;
              bunny.y = y;
            }
          }
        });

        renderPaddle(app, "left");
        renderPaddle(app, "right");

        await renderBunnyAsync(app);

        const handleKeyDown = (e: KeyboardEvent) => {
          keysPressed.current.add(e.key);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
          acceleration = 1;
          keysPressed.current.delete(e.key);
        };

        app.canvas.addEventListener("keydown", handleKeyDown);
        app.canvas.addEventListener("keyup", handleKeyUp);

        app.canvas.tabIndex = 1;
        app.canvas.focus();

        app.ticker.add(() => {
          // We will need to update this so we can control both paddles
          const paddleRef = rightPaddleRef;

          if (!paddleRef.current) return;

          if (keysPressed.current.has("ArrowUp")) {
            paddleRef.current.y = Math.max(
              0,
              paddleRef.current.y - paddleSpeed - acceleration,
            );
            acceleration += Math.min(acceleration * 0.1, 1);
          }

          if (keysPressed.current.has("ArrowDown")) {
            paddleRef.current.y = Math.min(
              app.screen.height - paddleHeight, // paddle height,
              paddleRef.current.y + paddleSpeed + acceleration,
            );

            acceleration += Math.min(acceleration * 0.1, 1);
          }

          // Send paddle position to the server
          if (socket && paddleRef.current && roomIdRef.current) {
            socket.emit("movePaddle", {
              roomId: roomIdRef.current,
              position: paddleRef.current.y,
            });
          }
        });
      }
    };

    func();
  }, []);

  const renderPaddle = (
    app: Application<Renderer>,
    whichOne: "left" | "right",
  ) => {
    const graphics = new Graphics();

    const paddleYCoordinate = (app.screen.height - paddleHeight) / 2;

    const paddleXCoordinate =
      whichOne === "left"
        ? paddlePadding
        : app.screen.width - (paddlePadding + paddleWidth);

    const paddle = graphics
      .rect(0, 0, paddleWidth, paddleHeight)
      .fill("#ffffff");

    paddle.x = paddleXCoordinate;
    paddle.y = paddleYCoordinate;

    app.stage.addChild(paddle);

    if (whichOne === "right") {
      rightPaddleRef.current = paddle;
    } else {
      leftPaddleRef.current = paddle;
    }
  };

  const renderBunnyAsync = async (app: Application<Renderer>) => {
    const texture = await Assets.load("https://pixijs.com/assets/bunny.png");

    const bunny = new Sprite(texture);

    app.stage.addChild(bunny);
    bunny.anchor.set(0.5);

    const startingXCoordinate = app.screen.width / 2;
    const startingYCoordinate = app.screen.height / 2;

    bunny.x = startingXCoordinate;
    bunny.y = startingYCoordinate;

    let moveSpeedX = Math.random() > 0.5 ? 5 : -5;
    let moveSpeedY = Math.random() > 0.5 ? 3 : -3;

    app.ticker.add((time) => {
      bunny.x -= moveSpeedX * time.deltaTime;
      bunny.y -= moveSpeedY * time.deltaTime;
      bunny.rotation += 0.1 * time.deltaTime;

      // Make sure we hit the left paddle
      if (leftPaddleRef.current) {
        if (bunny.x <= app.screen.x + paddleWidth + paddlePadding) {
          console.log("bunny x", bunny.x);
          console.log("app screen x", app.screen.x);
          const leftPaddleYStart = leftPaddleRef.current.y;
          const leftPaddleYEnd = leftPaddleRef.current.y + paddleHeight;

          if (bunny.y >= leftPaddleYStart && bunny.y <= leftPaddleYEnd) {
            moveSpeedX *= -1;
            if (moveSpeedY < 0) {
              moveSpeedY -= acceleration / 10;
            } else {
              moveSpeedY += acceleration / 10;
            }
          } else {
            // alert("Game over!");
          }
        }
      }

      // Make sure we hit the right paddle
      if (rightPaddleRef.current) {
        const rightPaddleYStart = rightPaddleRef.current.y;
        const rightPaddleYEnd = rightPaddleRef.current.y + paddleHeight;

        if (bunny.x >= canvasWidth - (paddleWidth + paddlePadding)) {
          if (bunny.y >= rightPaddleYStart && bunny.y <= rightPaddleYEnd) {
            moveSpeedX *= -1;
            if (moveSpeedY < 0) {
              moveSpeedY -= acceleration / 10;
            } else {
              moveSpeedY += acceleration / 10;
            }
          } else {
            // alert("Game over!");
          }
        }
      }

      // If we hit the top or bottom, we need to bounce off
      if (bunny.y < 0 || bunny.y > app.screen.height) {
        moveSpeedY *= -1;
      }
    });
  };

  return (
    <div className=" items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>Welcome to Paddle</h1>
        <div ref={pixiContainerRef}></div>
      </main>
    </div>
  );
}
