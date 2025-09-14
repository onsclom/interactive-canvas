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
  showGrid: true,
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
  resizing: null as ["top" | "bottom", "left" | "right"] | null,
  draggingOffset: { x: 0, y: 0 },

  lastSelected: -1, // index of last selected shape
};

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  Ui.start(ctx);

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

  //  ui resize buttons on 4 corners
  let hoveredResize = null as null | {
    x: number;
    y: number;
  };
  const resizeRadius = 1;
  let resizePositions = [] as { x: number; y: number }[];
  if (state.lastSelected !== -1) {
    const shape = state.shapes[state.lastSelected]!;
    resizePositions = [
      { x: shape.left, y: shape.top },
      { x: shape.right, y: shape.top },
      { x: shape.right, y: shape.bottom },
      { x: shape.left, y: shape.bottom },
    ];
  }
  for (const corner of resizePositions) {
    const dx = mouseWorld.x - corner.x;
    const dy = mouseWorld.y - corner.y;
    const dist = Math.hypot(dx, dy);
    if (dist < resizeRadius) {
      hoveredResize = corner;
    }
  }

  if (state.dragging < 0 && Input.mouse.justLeftClicked) {
    state.dragging = -1;
    state.resizing = null;

    // todo if over resize handle, setup for resizing
    if (state.lastSelected >= 0) {
      for (const corner of resizePositions) {
        const dx = mouseWorld.x - corner.x;
        const dy = mouseWorld.y - corner.y;
        const dist = Math.hypot(dx, dy);
        if (dist < resizeRadius) {
          state.dragging = state.lastSelected;
          state.draggingOffset.x = corner.x - mouseWorld.x;
          state.draggingOffset.y = corner.y - mouseWorld.y;

          const shape = state.shapes[state.lastSelected]!;
          state.dragging = state.lastSelected;
          state.resizing = [
            corner.y === shape.top ? "top" : "bottom",
            corner.x === shape.left ? "left" : "right",
          ];
        }
      }
    }

    if (state.dragging == -1 && hoveredShapeIndex !== -1) {
      state.dragging = hoveredShapeIndex;
      const hovered = state.shapes[hoveredShapeIndex]!;
      state.draggingOffset.x = mouseWorld.x - hovered.left;
      state.draggingOffset.y = mouseWorld.y - hovered.top;
      state.lastSelected = hoveredShapeIndex;
    }
  }

  if (state.dragging !== -1) {
    const draggingShape = state.shapes[state.dragging]!;

    if (Input.mouse.leftClickDown) {
      if (state.resizing === null) {
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
        // resizing
        const [vert, horiz] = state.resizing;
        if (horiz === "left") {
          draggingShape.left =
            Math.round((mouseWorld.x + state.draggingOffset.x) / gridSize) *
            gridSize;
          // don't let left go past right
          if (draggingShape.left > draggingShape.right - gridSize) {
            draggingShape.left = draggingShape.right - gridSize;
          }
        } else {
          draggingShape.right =
            Math.round((mouseWorld.x + state.draggingOffset.x) / gridSize) *
            gridSize;
          // don't let right go past left
          if (draggingShape.right < draggingShape.left + gridSize) {
            draggingShape.right = draggingShape.left + gridSize;
          }
        }
        if (vert === "top") {
          draggingShape.top =
            Math.round((mouseWorld.y + state.draggingOffset.y) / gridSize) *
            gridSize;
          // don't let top go past bottom
          if (draggingShape.top > draggingShape.bottom - gridSize) {
            draggingShape.top = draggingShape.bottom - gridSize;
          }
        } else {
          draggingShape.bottom =
            Math.round((mouseWorld.y + state.draggingOffset.y) / gridSize) *
            gridSize;
          // don't let bottom go past top
          if (draggingShape.bottom < draggingShape.top + gridSize) {
            draggingShape.bottom = draggingShape.top + gridSize;
          }
        }
      }
    } else {
      state.dragging = -1;
    }
  }

  if (
    (Input.mouse.justLeftClicked &&
      state.dragging === -1 &&
      hoveredShapeIndex === -1) ||
    Input.keysJustPressed.has("Escape")
  ) {
    state.lastSelected = -1;
  }

  Camera.drawWithCamera(ctx, state.camera, (ctx) => {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 0.5;
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

    // draw outline of last selected shape
    if (state.lastSelected !== -1) {
      const shape = state.shapes[state.lastSelected]!;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 1]);
      ctx.lineDashOffset = performance.now() * -0.002;
      if (shape.type === "rect") {
        ctx.strokeRect(
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
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const corner of resizePositions) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, resizeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // draw grid stuff
    if (state.showGrid) {
      const gridColor = "#aaa";
      ctx.fillStyle = gridColor;
      ctx.strokeStyle = gridColor;
      const gridDotSize = 0.5;
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
      ctx.lineWidth = 0.25;
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
    const buttonHeight = 30;
    y += buttonHeight + spacing;

    const windowWidth = 200;
    const windowHeight = 300;
    Ui.window("shapes", spacing, spacing, windowWidth, windowHeight, () => {
      let x = spacing;
      let y = spacing;
      const copiedShapes = state.shapes.slice();
      for (let i = 0; i < copiedShapes.length; i++) {
        const shape = copiedShapes[i]!;
        x = spacing;

        const rowHeight = 20;

        // delete button
        if (Ui.button("X", x, y, rowHeight, rowHeight, `delete-shape-${i}`)) {
          state.shapes.splice(i, 1);
        }
        x += rowHeight + spacing;

        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        if (state.lastSelected === i) {
          ctx.fillStyle = "yellow";
        }
        ctx.fillText(`${shape.type} - ${shape.color}`, x, y);
        ctx.restore();
        y += rowHeight + spacing;
      }
    });

    Ui.window(
      "camera",
      spacing,
      windowHeight + 100,
      windowWidth,
      windowHeight,
      () => {
        let x = spacing;
        let y = spacing;

        if (Ui.button("reset", x, y, 100, 30)) {
          state.camera.x = 0;
          state.camera.y = 0;
        }
        y += 30 + spacing;

        if (Ui.button("toggle grid", x, y, 100, 30)) {
          state.showGrid = !state.showGrid;
        }
        y += 30 + spacing;

        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(
          `pos: ${state.camera.x.toFixed(1)}, ${state.camera.y.toFixed(1)}`,
          x,
          y,
        );
        y += 20 + spacing;
        ctx.fillText(`zoom: ${state.camera.zoom.toFixed(2)}`, x, y);
      },
    );
  }

  Ui.end(dt);

  if (state.dragging !== -1) {
    if (state.resizing !== null) {
      const yDir = state.resizing[0];
      const xDir = state.resizing[1];
      if (
        (yDir === "top" && xDir === "left") ||
        (yDir === "bottom" && xDir === "right")
      ) {
        ctx.canvas.style.cursor = "nwse-resize";
      } else {
        ctx.canvas.style.cursor = "nesw-resize";
      }
    } else {
      ctx.canvas.style.cursor = "grabbing";
    }
  } else if (hoveredResize) {
    const shape = state.shapes[state.lastSelected]!;
    const onTop = hoveredResize.y === shape.top;
    const onLeft = hoveredResize.x === shape.left;
    if ((onTop && onLeft) || (!onTop && !onLeft)) {
      ctx.canvas.style.cursor = "nwse-resize";
    } else {
      ctx.canvas.style.cursor = "nesw-resize";
    }
  } else if (hoveredShapeIndex !== -1) {
    ctx.canvas.style.cursor = "grab";
  }

  Input.resetInput();
}
