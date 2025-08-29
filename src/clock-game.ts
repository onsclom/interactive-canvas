import * as Camera from "./camera";
import * as Input from "./input";
import { lerp } from "./math";
import { playFailureSound, playSuccessSound } from "./sound";

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
  targetSize: Math.PI / 8,

  beamIntensity: 0,
  freezeTime: 0,

  targetWidth: 1,

  dir: 1,

  impactTranslateX: 0,
  impactTranslateY: 0,

  gameOver: false,
  score: 0,
};

const backgroundColor = "#88a";
const centerTargetSize = state.targetSize * (1 / 3);

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  if (state.freezeTime > 0) {
    const amountToSubtract = Math.min(state.freezeTime, dt);
    state.freezeTime -= amountToSubtract;
    dt -= amountToSubtract;
  }

  const canvasRect = ctx.canvas.getBoundingClientRect();

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  const pointerSpeed = 0.006;
  if (!state.gameOver) {
    state.pointerAngle += dt * pointerSpeed * state.dir;
  }

  const gameSize = { width: 100, height: 100 };

  state.camera.zoom = Camera.aspectFitZoom(
    canvasRect,
    gameSize.width,
    gameSize.height,
  );

  // const cameraShakeX = Math.sin(performance.now() * 0.04) * state.beamIntensity;
  // const cameraShakeY =
  //   Math.cos(performance.now() * 0.039) * state.beamIntensity;
  // state.camera.x = -state.impactTranslateX * 5;
  // // + cameraShakeX;
  // state.camera.y = -state.impactTranslateY * 5;
  // // + cameraShakeY;

  // pointer angle in [0, 2PI)
  const pointerAngleMod = mod(state.pointerAngle, Math.PI * 2);
  const targetWraps = state.target + state.targetSize > Math.PI * 2;
  const pointerInTarget = targetWraps
    ? pointerAngleMod > state.target ||
      pointerAngleMod < mod(state.target + state.targetSize, Math.PI * 2)
    : pointerAngleMod > state.target &&
      pointerAngleMod < state.target + state.targetSize;

  const innerTargetStart = mod(
    state.target + state.targetSize / 2 - centerTargetSize / 2,
    Math.PI * 2,
  );
  const innerTargetWraps = innerTargetStart + centerTargetSize > Math.PI * 2;
  const pointerInInnerTarget = innerTargetWraps
    ? pointerAngleMod > innerTargetStart ||
      pointerAngleMod < mod(innerTargetStart + centerTargetSize, Math.PI * 2)
    : pointerAngleMod > innerTargetStart &&
      pointerAngleMod < innerTargetStart + centerTargetSize;

  if (Input.keysJustPressed.has(" ") || Input.mouse.justLeftClicked) {
    if (state.gameOver) {
      state.gameOver = false;
      state.score = 0;
    } else {
      if (pointerInTarget) {
        state.target = Math.random() * Math.PI * 2;
        state.dir *= -1;
        state.beamIntensity = 1;
        state.freezeTime += 0.042 * 1000;
        state.targetWidth = 0;

        state.impactTranslateX = Math.cos(state.pointerAngle);
        state.impactTranslateY = Math.sin(state.pointerAngle);

        state.score += 1;

        playSuccessSound();
      } else {
        playFailureSound();
        state.gameOver = true;
      }
    }
  }

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
    state.impactTranslateX = lerp(
      state.impactTranslateX,
      0,
      1 - Math.exp(-smoothing * dt * 2),
    );
    state.impactTranslateY = lerp(
      state.impactTranslateY,
      0,
      1 - Math.exp(-smoothing * dt * 2),
    );

    const circleMargin = 5;
    ctx.lineWidth = 0.5;

    ctx.strokeStyle = "white";
    ctx.beginPath();
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

    // target center target
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      gameSize.width / 2 - circleMargin,
      gameSize.height / 2 - circleMargin,
      0,
      state.target + state.targetSize / 2 - centerTargetSize / 2,
      state.target + state.targetSize / 2 + centerTargetSize / 2,
    );
    ctx.stroke();
    ctx.closePath();

    const pointerLength = gameSize.width / 2 - circleMargin;
    const pointerX = Math.cos(state.pointerAngle) * pointerLength;
    const pointerY = Math.sin(state.pointerAngle) * pointerLength;

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

        const offset = Math.random() * state.beamIntensity * (10 / (t + 1));
        const ox = Math.cos(offsetAngle) * offset;
        const oy = Math.sin(offsetAngle) * offset;
        ctx.lineTo(px + ox, py + oy);
      }
      ctx.lineTo(pointerX, pointerY);
      ctx.stroke();
      ctx.closePath();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "yellow";
    ctx.beginPath();
    const radius = 8;
    ctx.ellipse(0, 0, radius, radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    const innerRadius = radius * 0.9;
    ctx.ellipse(0, 0, innerRadius, innerRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "7px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(`${state.score}`, 0.5, 0.5);
    ctx.fillStyle = "white";
    ctx.fillText(`${state.score}`, 0, 0);
  });

  Input.resetInput();
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
