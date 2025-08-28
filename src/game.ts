import * as Input from "./input";
import * as Camera from "./camera";

const state = {
  character: { x: 0, y: 0 },
  camera: Camera.create(),
};

const characterSize = 10;

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  {
    // char movement
    if (Input.keysDown.has("d")) {
      state.character.x += 0.1 * dt;
    }
    if (Input.keysDown.has("a")) {
      state.character.x -= 0.1 * dt;
    }
    if (Input.keysDown.has("s")) {
      state.character.y += 0.1 * dt;
    }
    if (Input.keysDown.has("w")) {
      state.character.y -= 0.1 * dt;
    }
  }

  {
    // camera movement
    state.camera.x = state.character.x;
    state.camera.y = state.character.y;
    if (Input.keysDown.has("ArrowUp")) {
      state.camera.zoom *= 1 + 0.001 * dt;
    }
    if (Input.keysDown.has("ArrowDown")) {
      state.camera.zoom /= 1 + 0.001 * dt;
    }
    if (Input.keysDown.has("ArrowRight")) {
      state.camera.rotation += 0.001 * dt;
    }
    if (Input.keysDown.has("ArrowLeft")) {
      state.camera.rotation -= 0.001 * dt;
    }
  }

  const gameWorld = {
    width: 200,
    height: 100,
  };

  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      -gameWorld.width / 2,
      -gameWorld.height / 2,
      gameWorld.width,
      gameWorld.height,
    );

    ctx.fillStyle = "blue";
    ctx.fillRect(
      state.character.x - characterSize / 2,
      state.character.y - characterSize / 2,
      characterSize,
      characterSize,
    );

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  const worldCursor = Camera.screenToWorld(
    Input.mouse.x,
    Input.mouse.y,
    ctx.canvas.getBoundingClientRect(),
    state.camera,
  );
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "white";
  ctx.fillText(
    `world cursor: ${Math.round(worldCursor.x)}, ${Math.round(worldCursor.y)}`,
    10,
    20,
  );

  Input.resetInput();
}
