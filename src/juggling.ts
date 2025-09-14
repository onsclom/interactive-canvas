import * as Input from "./input.js";
import * as Camera from "./camera.js";
import * as Ui from "./ui.js";

const state = {
  camera: Camera.create(),
  // eventually make this just an entity?
  balls: [] as {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    timeSinceGrounded: number;
  }[],

  timeToSimulate: 0,

  grabbingBall: -1,
  grabOffset: { x: 0, y: 0 },

  timeJuggling: 0,
  timeJugglingHighScore: 0,
  gameOver: false,
};

const gameArea = {
  width: 100,
  height: 100,
};

const gravity = 0.0098;
const airResistance = 0.9975;

const groundedThreshold = 100;

// init stuff:
for (let i = 0; i < 3; i++) {
  state.balls.push({
    x: i * 5 - i * 2.5,
    y: 50,
    vx: 0,
    vy: 0,
    r: 5,
    timeSinceGrounded: 0,
  });
}

const white = "#eee";
const red = "#f44";
const green = "#4f4";

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  Ui.start(ctx);

  const speed = 1;
  dt *= speed;

  const rect = ctx.canvas.getBoundingClientRect();
  ctx.fillStyle = "#555";
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.lineWidth = 0.2;
  state.camera.zoom =
    Camera.aspectFitZoom(rect, gameArea.width, gameArea.height) * 0.9;
  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    ctx.strokeStyle = white;
    ctx.strokeRect(
      -gameArea.width / 2,
      -gameArea.height / 2,
      gameArea.width,
      gameArea.height,
    );

    // draw red line for floor
    ctx.strokeStyle = red;
    ctx.beginPath();
    ctx.moveTo(-gameArea.width / 2, gameArea.height / 2);
    ctx.lineTo(gameArea.width / 2, gameArea.height / 2);
    ctx.stroke();

    // update
    const mouseInWorld = Camera.screenToWorld(
      Input.mouse.x,
      Input.mouse.y,
      rect,
      state.camera,
    );
    {
      state.timeToSimulate += dt;
      const fixedPhysicsHz = 1000;
      const timePerTick = 1000 / fixedPhysicsHz;

      ctx.canvas.style.cursor = "default";
      if (state.grabbingBall === -1) {
        const hoveredBall = state.balls.findIndex((ball) => {
          const dx = mouseInWorld.x - ball.x;
          const dy = mouseInWorld.y - ball.y;
          return dx * dx + dy * dy < ball.r * ball.r;
        });
        if (hoveredBall !== -1) {
          ctx.canvas.style.cursor = "grab";
        }
        if (hoveredBall !== -1 && Input.mouse.justLeftClicked) {
          state.grabbingBall = hoveredBall;
          state.grabOffset.x = state.balls[hoveredBall]!.x - mouseInWorld.x;
          state.grabOffset.y = state.balls[hoveredBall]!.y - mouseInWorld.y;
        }
      } else {
        if (!Input.mouse.leftClickDown) {
          state.grabbingBall = -1;
        }
      }
      if (state.grabbingBall !== -1) {
        ctx.canvas.style.cursor = "grabbing";
      }

      while (state.timeToSimulate >= timePerTick) {
        state.timeToSimulate -= timePerTick;

        const bounciness = 0.5;
        for (let i = 0; i < state.balls.length; i++) {
          const ball = state.balls[i]!;
          const grabbing = state.grabbingBall === i;

          if (grabbing) {
            // lerp towards mouse
            const lerpFactor = 0.05;
            const targetX = mouseInWorld.x + state.grabOffset.x;
            const targetY = mouseInWorld.y + state.grabOffset.y;
            ball.vx = (targetX - ball.x) * lerpFactor;
            ball.vy = (targetY - ball.y) * lerpFactor;
            ball.x += ball.vx * timePerTick;
            ball.y += ball.vy * timePerTick;
          } else {
            ball.vy += gravity * timePerTick * 0.01;
            ball.x += ball.vx * timePerTick;
            ball.y += ball.vy * timePerTick;

            // air resistance
            ball.vx *= airResistance ** timePerTick;
            ball.vy *= airResistance ** timePerTick;
          }

          // collisions between balls
          for (let j = i + 1; j < state.balls.length; j++) {
            const otherBall = state.balls[j]!;
            const dx = otherBall.x - ball.x;
            const dy = otherBall.y - ball.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ball.r + otherBall.r) {
              // immediately separate balls with small buffer to prevent re-triggering
              const overlap = ball.r + otherBall.r - dist + 0.5; // Added buffer to ensure separation
              const nx = dx / dist;
              const ny = dy / dist;

              ball.x -= nx * (overlap / 2);
              ball.y -= ny * (overlap / 2);
              otherBall.x += nx * (overlap / 2);
              otherBall.y += ny * (overlap / 2);

              // Calculate relative velocity along collision normal
              const dvx = otherBall.vx - ball.vx;
              const dvy = otherBall.vy - ball.vy;
              const dvDotN = dvx * nx + dvy * ny;

              // Only resolve if balls are moving towards each other
              if (dvDotN < 0) {
                const restitution = 0.01; // Bounciness factor (0 = perfectly inelastic, 1 = perfectly elastic)
                const impulse = dvDotN * (1 + restitution); // Correct impulse for equal masses

                // Apply impulse to velocities
                ball.vx += impulse * nx;
                ball.vy += impulse * ny;
                otherBall.vx -= impulse * nx;
                otherBall.vy -= impulse * ny;
              }
            }
          }

          // collisions with walls
          ball.timeSinceGrounded += timePerTick;
          if (ball.y + ball.r > gameArea.height / 2) {
            ball.y = gameArea.height / 2 - ball.r;
            ball.vy *= -bounciness;
            ball.timeSinceGrounded = 0;
          }
          if (ball.y - ball.r < -gameArea.height / 2) {
            ball.y = -gameArea.height / 2 + ball.r;
            ball.vy *= -bounciness;
          }
          if (ball.x + ball.r > gameArea.width / 2) {
            ball.x = gameArea.width / 2 - ball.r;
            ball.vx *= -bounciness;
          }
          if (ball.x - ball.r < -gameArea.width / 2) {
            ball.x = -gameArea.width / 2 + ball.r;
            ball.vx *= -bounciness;
          }
        }
      }
    }
    // draw
    for (const ball of state.balls) {
      ctx.fillStyle = ball.timeSinceGrounded < groundedThreshold ? red : green;
      ctx.beginPath();
      ctx.ellipse(ball.x, ball.y, ball.r, ball.r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  {
    const anyBallGrounded = state.balls.some(
      (b) => b.timeSinceGrounded < groundedThreshold,
    );

    if (anyBallGrounded) {
      state.timeJuggling = 0;
    } else {
      state.timeJuggling += dt;
      state.timeJugglingHighScore = Math.max(
        state.timeJugglingHighScore,
        state.timeJuggling,
      );
    }
  }

  const margin = 10;
  {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const fontSize = 40;
    ctx.font = `${fontSize}px sans-serif`;
    const timeJugglingSeconds = (state.timeJuggling / 1000).toFixed(2);
    ctx.fillStyle = "black";
    ctx.fillText(`${timeJugglingSeconds}`, margin + 2, margin + 2);
    ctx.fillStyle = white;
    ctx.fillText(`${timeJugglingSeconds}`, margin, margin);

    ctx.fillStyle = "black";
    ctx.font = `${fontSize / 2}px sans-serif`;
    const highScoreSeconds = (state.timeJugglingHighScore / 1000).toFixed(2);
    ctx.fillText(
      `Best: ${highScoreSeconds}`,
      margin + 2,
      margin + fontSize + 2,
    );
    ctx.fillStyle = white;
    ctx.fillText(`Best: ${highScoreSeconds}`, margin, margin + fontSize);
  }

  const buttonWidth = 100;
  const buttonHeight = 30;
  let x = rect.width - buttonWidth - margin;
  let y = margin;
  if (Ui.button("+ ball", x, y, buttonWidth, buttonHeight)) {
    state.balls.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 5,
      timeSinceGrounded: 0,
    });
  }
  y += buttonHeight + margin;
  if (Ui.button("- ball", x, y, buttonWidth, buttonHeight)) {
    if (state.balls.length > 1) {
      state.balls.pop();
    }
  }

  Input.resetInput();

  const gameCursor = ctx.canvas.style.cursor;
  Ui.end(dt);
  if (ctx.canvas.style.cursor !== "pointer") {
    ctx.canvas.style.cursor = gameCursor;
  }
}
