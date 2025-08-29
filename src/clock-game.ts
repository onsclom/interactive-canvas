import * as Camera from "./camera";
import * as Input from "./input";
import { lerp } from "./math";
import { playSuccessSound } from "./sound";

/*
TODO:
- more points for centered hits
  - streaks?
- lightning effect
- sounds effects (randomize or pitch up?)
- hit freeze
- particle effects
- screen shake
- speed up with a function of score?
- high score support?
*/

const state = {
  camera: Camera.create(),

  pointerAngle: 0,

  // the clockwise start of the target, not the center
  target: Math.random() * Math.PI * 2,
  targetSize: Math.PI / 4,

  beamIntensity: 0,
  freezeTime: 0,

  targetWidth: 1,

  dir: 1,
};

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  if (state.freezeTime > 0) {
    const amountToSubtract = Math.min(state.freezeTime, dt);
    state.freezeTime -= amountToSubtract;
    dt -= amountToSubtract;
  }

  const canvasRect = ctx.canvas.getBoundingClientRect();

  ctx.fillStyle = "#88a";
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  const pointerSpeed = 0.004;
  state.pointerAngle += dt * pointerSpeed * state.dir;

  const gameSize = { width: 100, height: 100 };

  state.camera.zoom = Camera.aspectFitZoom(
    canvasRect,
    gameSize.width,
    gameSize.height,
  );

  // pointer angle in [0, 2PI)
  const pointerAngleMod = mod(state.pointerAngle, Math.PI * 2);
  const targetWraps = state.target + state.targetSize > Math.PI * 2;
  const pointerInTarget = targetWraps
    ? pointerAngleMod > state.target ||
      pointerAngleMod < mod(state.target + state.targetSize, Math.PI * 2)
    : pointerAngleMod > state.target &&
      pointerAngleMod < state.target + state.targetSize;

  const cameraShakeX = Math.sin(performance.now() * 0.04) * state.beamIntensity;
  const cameraShakeY =
    Math.cos(performance.now() * 0.039) * state.beamIntensity;
  state.camera.x = cameraShakeX;
  state.camera.y = cameraShakeY;

  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    const smoothing = 0.005;
    state.beamIntensity = lerp(
      state.beamIntensity,
      0,
      1 - Math.exp(-smoothing * dt),
    );
    state.targetWidth = lerp(
      state.targetWidth,
      1,
      1 - Math.exp(-smoothing * 1.5 * dt),
    );

    ctx.lineWidth = 0.0;
    ctx.strokeStyle = "white";
    ctx.beginPath();
    const circleMargin = 5;
    ctx.ellipse(
      0,
      0,
      gameSize.width / 2 - circleMargin,
      gameSize.height / 2 - circleMargin,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.closePath();

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 * state.targetWidth;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      gameSize.width / 2 - circleMargin,
      gameSize.height / 2 - circleMargin,
      0,
      state.target,
      state.target + state.targetSize,
    );
    ctx.stroke();
    ctx.closePath();

    const pointerLength = gameSize.width / 2 - circleMargin;
    const pointerX = Math.cos(state.pointerAngle) * pointerLength;
    const pointerY = Math.sin(state.pointerAngle) * pointerLength;

    // draw lightning effect pointer
    const lightningStrikes = 3;
    ctx.lineCap = "round";
    ctx.globalAlpha = 1;
    for (const _ of Array(lightningStrikes)) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const lightningPoints = 20;
      for (let i = 0; i <= lightningPoints; i++) {
        // ignore first and last
        if (i === 0 || i === lightningPoints) continue;

        const t = i / lightningPoints;
        const px = Math.cos(state.pointerAngle) * pointerLength * t;
        const py = Math.sin(state.pointerAngle) * pointerLength * t;

        const offsetAngle = Math.random() * Math.PI * 2;

        const offset = Math.random() * state.beamIntensity * 7;
        const ox = Math.cos(offsetAngle) * offset;
        const oy = Math.sin(offsetAngle) * offset;
        ctx.lineTo(px + ox, py + oy);
      }
      ctx.lineTo(pointerX, pointerY);
      ctx.stroke();
      ctx.closePath();
    }
    ctx.globalAlpha = 1;
  });

  if (Input.keysJustPressed.has(" ") || Input.mouse.justLeftClicked) {
    if (pointerInTarget) {
      console.log("Hit!");
      state.target = Math.random() * Math.PI * 2;
      state.dir *= -1;
      state.beamIntensity = 1;
      state.freezeTime += 0.042 * 1000;
      state.targetWidth = 0;
      playSuccessSound();
    }
  }

  Input.resetInput();
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
