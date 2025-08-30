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
  animatedScore: 0,

  scoreIntensity: 0,

  screenshakeIntensity: 0,

  scoreFeedbackText: [] as {
    text: string;
    x: number;
    y: number;
    lifetime: number;
    totalLifetime: number;
    size: number;
    color: string;
  }[],

  backgroundParticles: [] as {
    x: number;
    y: number;
    lifetime: number;
    totalLifetime: number;

    // unit vector
    dx: number;
    dy: number;
    rotationFactor: number;
    color: string;
  }[],
  backgroundParticleSpawnTimer: 0,
};

const backgroundColor = "#88a";
const particleColor = "#448";
const centerTargetSize = state.targetSize * (1 / 3);
const circleMargin = 5;
const gameSize = { width: 100, height: 100 };
const circleRadius = gameSize.width / 2 - circleMargin;

const pointerStartSpeed = 0.003;
const pointerEndSpeed = 0.009;
function getPointerSpeedForScore(score: number) {
  return (
    pointerEndSpeed -
    (pointerEndSpeed - pointerStartSpeed) * Math.exp(-0.025 * score)
  );
}

const startFreezeTime = 0.042 * 1000;
const endFreezeTime = 0.1 * 1000;
function getFreezeTimeForScore(score: number) {
  return (
    endFreezeTime - (endFreezeTime - startFreezeTime) * Math.exp(-0.025 * score)
  );
}

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  if (state.freezeTime > 0) {
    const amountToSubtract = Math.min(state.freezeTime, dt);
    state.freezeTime -= amountToSubtract;
    dt -= amountToSubtract;
  }

  const canvasRect = ctx.canvas.getBoundingClientRect();

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);

  const pointerSpeed = getPointerSpeedForScore(state.score);
  if (!state.gameOver) {
    state.pointerAngle += dt * pointerSpeed * state.dir;
  }

  state.camera.zoom = Camera.aspectFitZoom(
    canvasRect,
    gameSize.width,
    gameSize.height,
  );

  const screenShakeStrength = 5;
  const cameraShakeX =
    Math.sin(performance.now() * 0.04) *
    state.screenshakeIntensity *
    screenShakeStrength;
  const cameraShakeY =
    Math.cos(performance.now() * 0.039) *
    state.screenshakeIntensity *
    screenShakeStrength;
  state.camera.x = -state.impactTranslateX * 5 + cameraShakeX;
  state.camera.y = -state.impactTranslateY * 5 + cameraShakeY;

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
        state.freezeTime += getFreezeTimeForScore(state.score);
        state.targetWidth = 0;

        state.impactTranslateX = Math.cos(state.pointerAngle);
        state.impactTranslateY = Math.sin(state.pointerAngle);

        const lifetime = 500;
        if (pointerInInnerTarget) {
          state.score += 5;
          state.scoreIntensity = 1;
          state.scoreFeedbackText.push({
            text: "+5",
            x: Math.cos(state.pointerAngle) * circleRadius,
            y: Math.sin(state.pointerAngle) * circleRadius,
            lifetime,
            totalLifetime: lifetime,
            size: 10,
            color: "gold",
          });
        } else {
          state.score += 1;
          state.scoreIntensity = 0.5;
          state.scoreFeedbackText.push({
            text: "+1",
            x: Math.cos(state.pointerAngle) * circleRadius,
            y: Math.sin(state.pointerAngle) * circleRadius,
            lifetime,
            totalLifetime: lifetime,
            size: 5,
            color: "silver",
          });
        }

        playSuccessSound(state.score);
      } else {
        playFailureSound();
        state.gameOver = true;
        state.screenshakeIntensity = 1;
      }
    }
  }

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
  state.scoreIntensity = lerp(
    state.scoreIntensity,
    0,
    1 - Math.exp(-smoothing * dt),
  );
  state.screenshakeIntensity = lerp(
    state.screenshakeIntensity,
    0,
    1 - Math.exp(-smoothing * dt),
  );
  state.animatedScore = lerp(
    state.animatedScore,
    state.score,
    1 - Math.exp(-smoothing * dt),
  );

  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    state.backgroundParticleSpawnTimer += dt;
    const backgroundParticleSpawnInterval = 50;

    {
      const baselineLifetime = 5000;
      const lifetimeRandomness = 5000;
      while (
        state.backgroundParticleSpawnTimer > backgroundParticleSpawnInterval
      ) {
        state.backgroundParticleSpawnTimer -= backgroundParticleSpawnInterval;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.5;
        const lifetime = baselineLifetime + Math.random() * lifetimeRandomness;
        state.backgroundParticles.push({
          x: 0,
          y: 0,
          lifetime: lifetime,
          totalLifetime: lifetime,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color: `hsl(${Math.floor(Math.random() * 360 + 150)}, 70%, 80%)`,
          rotationFactor: (Math.random() * 2 - 1) * 0.01,
        });
      }
      for (let i = state.backgroundParticles.length - 1; i >= 0; i--) {
        const p = state.backgroundParticles[i]!;
        p.lifetime -= dt;
        if (p.lifetime <= 0) {
          state.backgroundParticles.splice(i, 1);
          continue;
        }
        // speed influenced by score
        const speed = 0.02 * (1 + state.animatedScore * 0.1);
        p.x += p.dx * speed * dt;
        p.y += p.dy * speed * dt;

        const size = (p.lifetime / p.totalLifetime) ** 2 * 5;
        // const alpha = (p.lifetime / p.totalLifetime) ** 2;
        // ctx.globalAlpha = alpha;
        const distFromCenter = Math.hypot(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.save();
        // rotate less the further dist is
        // ctx.rotate(10 * p.rotationFactor * (1 / (distFromCenter + 1)));
        ctx.rotate(
          Math.sin(distFromCenter * 0.25) *
            (100 / distFromCenter) *
            p.rotationFactor,
        );
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, size, size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

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
      ctx.strokeStyle = "red";
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

    ctx.fillStyle = "red";
    ctx.beginPath();
    const radius = 8;
    ctx.ellipse(0, 0, radius, radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    const innerRadius = radius - 0.5;
    ctx.ellipse(0, 0, innerRadius, innerRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = state.scoreFeedbackText.length - 1; i >= 0; i--) {
      const text = state.scoreFeedbackText[i]!;
      text.lifetime -= dt;
      ctx.font = `${text.size}px sans-serif`;

      ctx.globalAlpha = Math.max(0, (text.lifetime / text.totalLifetime) ** 2);
      ctx.fillStyle = "black";
      ctx.fillText(text.text, text.x + 0.5, text.y + 0.5);

      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
      ctx.globalAlpha = 1;
      if (text.lifetime <= 0) {
        state.scoreFeedbackText.splice(i, 1);
        continue;
      }
    }
  });

  if (state.gameOver) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasRect.width, canvasRect.height);
    ctx.globalAlpha = 1;
  }

  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "7px sans-serif";
    ctx.fillStyle = "black";

    const newScoreScale = 1 + state.scoreIntensity * 0.5;
    ctx.scale(newScoreScale, newScoreScale);
    if (state.gameOver) {
      ctx.rotate(Math.sin(performance.now() * 0.01) * 0.2);
    } else {
      ctx.rotate(Math.sin(performance.now() * 0.01) * state.scoreIntensity);
    }
    ctx.fillText(`${state.score}`, 0.5, 0.5);
    ctx.fillStyle = "white";
    ctx.fillText(`${state.score}`, 0, 0);
  });

  Input.resetInput();
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
