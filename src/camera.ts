export function create() {
  return {
    // center of camera
    x: 0,
    y: 0,

    rotation: 0,
    zoom: 1,
  };
}

type Camera = ReturnType<typeof create>;

export function drawWithCamera(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  ctx.save();
  const canvasRect = ctx.canvas.getBoundingClientRect();
  ctx.translate(canvasRect.width / 2, canvasRect.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.rotate(-camera.rotation);
  ctx.translate(-camera.x, -camera.y);
  draw(ctx);
  ctx.restore();
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  camera: Camera,
) {
  let x = screenX - canvasRect.width / 2;
  let y = screenY - canvasRect.height / 2;

  x /= camera.zoom;
  y /= camera.zoom;

  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);
  const rotatedX = x * cos - y * sin;
  const rotatedY = x * sin + y * cos;

  x = rotatedX + camera.x;
  y = rotatedY + camera.y;

  return { x, y };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  ctx: CanvasRenderingContext2D,
  camera: Camera,
) {
  const canvasRect = ctx.canvas.getBoundingClientRect();
  let x = worldX - camera.x;
  let y = worldY - camera.y;

  const cos = Math.cos(-camera.rotation);
  const sin = Math.sin(-camera.rotation);
  const rotatedX = x * cos - y * sin;
  const rotatedY = x * sin + y * cos;

  x = rotatedX * camera.zoom;
  y = rotatedY * camera.zoom;

  x += canvasRect.width / 2;
  y += canvasRect.height / 2;

  return { x, y };
}
