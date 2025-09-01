/*
ideas/todo:
 - zoom slider
 - make UI draggable windows like imgui stuff
   - one window might show scrollable list of shapes
     - each shape has editable properties (color, top, left, bot, right)
 - output to ctx2d code? or maybe some data a lib draws?
*/

import * as Input from "./input";
import * as Camera from "./camera";
import * as Ui from "./ui";

type Shape = {
  type: "ellipse" | "rect";
  left: number;
  top: number;
  right: number;
  bottom: number;
  color: string;
};

const gridSize = 5;

const state = {
  camera: Camera.create(),
  showGrid: Ui.ref(true),
  shapes: [
    {
      type: "rect",
      left: 0,
      top: 0,
      right: 10,
      bottom: 5,
      color: "red",
    },
    {
      type: "ellipse",
      left: 30,
      top: 40,
      right: 50,
      bottom: 50,
      color: "blue",
    },
  ] as Shape[],

  dragging: -1, // index of shape being dragged
  draggingOffset: { x: 0, y: 0 },
};

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const referenceRect = {
    width: 100,
    height: 100,
  };

  state.camera.zoom =
    Camera.aspectFitZoom(
      ctx.canvas.getBoundingClientRect(),
      referenceRect.width,
      referenceRect.height,
    ) * 0.9;
  // camera controls
  state.camera.x += (Input.mouse.wheelDx * 1) / state.camera.zoom;
  state.camera.y += (Input.mouse.wheelDy * 1) / state.camera.zoom;

  // see if hovering over a shape
  const mouseWorld = Camera.screenToWorld(
    Input.mouse.x,
    Input.mouse.y,
    ctx.canvas.getBoundingClientRect(),
    state.camera,
  );
  let hoveredShapeIndex = -1;
  for (let i = 0; i < state.shapes.length; i++) {
    const shape = state.shapes[i]!;
    if (shape.type === "rect") {
      const inX = mouseWorld.x >= shape.left && mouseWorld.x <= shape.right;
      const inY = mouseWorld.y >= shape.top && mouseWorld.y <= shape.bottom;
      if (inX && inY) {
        hoveredShapeIndex = i;
      }
    } else if (shape.type === "ellipse") {
      const rx = (shape.right - shape.left) / 2;
      const ry = (shape.bottom - shape.top) / 2;
      const h = (shape.left + shape.right) / 2;
      const k = (shape.top + shape.bottom) / 2;
      const value =
        ((mouseWorld.x - h) * (mouseWorld.x - h)) / (rx * rx) +
        ((mouseWorld.y - k) * (mouseWorld.y - k)) / (ry * ry);
      if (value <= 1) {
        hoveredShapeIndex = i;
      }
    }
  }
  if (
    state.dragging === -1 &&
    Input.mouse.justLeftClicked &&
    hoveredShapeIndex !== -1
  ) {
    state.dragging = hoveredShapeIndex;
    const hovered = state.shapes[hoveredShapeIndex]!;
    state.draggingOffset.x = mouseWorld.x - hovered.left;
    state.draggingOffset.y = mouseWorld.y - hovered.top;
  }
  if (state.dragging !== -1) {
    const draggingShape = state.shapes[state.dragging]!;

    if (Input.mouse.leftClickDown) {
      const width = draggingShape.right - draggingShape.left;
      const height = draggingShape.bottom - draggingShape.top;

      const left =
        Math.round((mouseWorld.x - state.draggingOffset.x) / gridSize) *
        gridSize;
      const top =
        Math.round((mouseWorld.y - state.draggingOffset.y) / gridSize) *
        gridSize;

      draggingShape.left = left;
      draggingShape.top = top;
      draggingShape.right = left + width;
      draggingShape.bottom = top + height;
    } else {
      state.dragging = -1;
    }
  }

  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      -referenceRect.width / 2,
      -referenceRect.height / 2,
      referenceRect.width,
      referenceRect.height,
    );

    for (const shape of state.shapes) {
      ctx.fillStyle = shape.color;
      if (shape.type === "rect") {
        ctx.fillRect(
          shape.left,
          shape.top,
          shape.right - shape.left,
          shape.bottom - shape.top,
        );
      } else if (shape.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(
          (shape.left + shape.right) / 2,
          (shape.top + shape.bottom) / 2,
          (shape.right - shape.left) / 2,
          (shape.bottom - shape.top) / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // draw grid stuff
    if (state.showGrid.value) {
      const gridColor = "#aaa";
      ctx.fillStyle = gridColor;
      ctx.strokeStyle = gridColor;
      const gridDotSize = 1;
      const startX = -referenceRect.width / 2;
      const startY = -referenceRect.height / 2;
      const endX = referenceRect.width / 2;
      const endY = referenceRect.height / 2;
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          // if (x === startX || x === endX || y === startY || y === endY) {
          //   continue; // skip border and center lines
          // }
          ctx.fillRect(
            x - gridDotSize / 2,
            y - gridDotSize / 2,
            gridDotSize,
            gridDotSize,
          );
        }
      }
      // draw line at x = 0 and y = 0
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -referenceRect.height / 2);
      ctx.lineTo(0, referenceRect.height / 2);
      ctx.moveTo(-referenceRect.width / 2, 0);
      ctx.lineTo(referenceRect.width / 2, 0);
      ctx.stroke();
    }
  });

  // UI STUFF
  ctx.font = "16px sans-serif";
  {
    const spacing = 10;
    let x = spacing;
    let y = spacing;
    const buttonWidth = 100;
    const buttonHeight = 30;

    if (
      Ui.button({
        text: "toggle grid",
        x,
        y,
        width: buttonWidth,
        height: buttonHeight,
      })
    ) {
      state.showGrid.value = !state.showGrid.value;
    }
    y += buttonHeight + spacing;

    if (
      Ui.button({
        text: "add rect",
        x,
        y,
        width: buttonWidth,
        height: buttonHeight,
      })
    ) {
      state.shapes.push({
        type: "rect",
        left: -gridSize,
        top: -gridSize,
        right: gridSize,
        bottom: gridSize,
        color: "green",
      });
    }
  }
  Ui.commitUI(ctx, dt);
  if (state.dragging !== -1) {
    ctx.canvas.style.cursor = "grabbing";
  } else if (hoveredShapeIndex !== -1) {
    ctx.canvas.style.cursor = "grab";
  }

  Input.resetInput();
}
