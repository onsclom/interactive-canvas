/*
planning:
- bring this into canvas-basics
- use existing input system
- make animation for clicking?
- animate values on checkboxes?
- make elements take props obj (with good default values)
- think about what a multiple pass solution would grant us
  - no delay hover is nice.. we can delete the "nextHovered" craziness
*/

export const state = {
  hovered: null as string | null, // last frames hovered
  dragging: null as string | null,
  resizing: null as string | null,
  nextHovered: null as string | null, // running hover on current frame

  cursor: "default" as CSSStyleDeclaration["cursor"],

  mouse: {
    x: 0,
    y: 0,
    prevx: 0,
    prevy: 0,
    dx: 0,
    dy: 0,
    justClicked: false,
    down: false,
  },
  ctx: null as CanvasRenderingContext2D | null,

  // persisted ui state for things like animation
  persisted: new Map<
    string,
    {
      // values for transitions
      hovered_t: number;
    }
  >(),

  frame: {
    // to handle z indexing
    windows: [] as {
      id: string;
      tick: () => void;
    }[],
  },

  windowPersistent: new Map<
    string,
    {
      x: number;
      y: number;
      width: number;
      height: number;
      z: number;
    }
  >(),
  windowZ: 0,
  inWindow: null as string | null,

  theme: {
    elementBackground: "#555",
    textColor: "#eee",
    font: "16px sans-serif",
    borderSize: 1,
    borderColor: "#333",
  },
};

document.body.addEventListener("mousemove", (e) => {
  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
});
document.body.addEventListener("mousedown", (e) => {
  state.mouse.justClicked = true;
  state.mouse.down = true;
});
document.body.addEventListener("mouseup", (e) => {
  state.mouse.down = false;
});

export function register(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  let mouseInsideParentWindow = true;
  if (state.inWindow) {
    const contentRect = windowContentSpace(state.inWindow);
    x += contentRect.x;
    y += contentRect.y;
    const mouseInWindow =
      state.mouse.x >= contentRect.x &&
      state.mouse.x <= contentRect.x + contentRect.width &&
      state.mouse.y >= contentRect.y &&
      state.mouse.y <= contentRect.y + contentRect.height;
    mouseInsideParentWindow = mouseInWindow;
  }

  const hovered =
    state.mouse.x >= x &&
    state.mouse.x <= x + width &&
    state.mouse.y >= y &&
    state.mouse.y <= y + height &&
    mouseInsideParentWindow;

  if (hovered) {
    state.nextHovered = id;
  }

  if (!state.persisted.has(id)) {
    state.persisted.set(id, {
      hovered_t: 0,
    });
  }
}

export function button(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  forceId?: string,
): boolean {
  const id = forceId ?? `button-${state.inWindow}-${text}`;
  register(id, x, y, width, height);

  const hovered = state.hovered === id;

  // draw button
  const ctx = state.ctx;
  if (ctx) {
    // border bakcground

    ctx.fillStyle = state.theme.borderColor;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = state.theme.elementBackground;
    ctx.fillRect(
      x + state.theme.borderSize,
      y + state.theme.borderSize,
      width - state.theme.borderSize * 2,
      height - state.theme.borderSize * 2,
    );

    ctx.fillStyle = state.theme.textColor;

    {
      const hovered_t = state.persisted.get(id)?.hovered_t || 0;
      ctx.save();
      ctx.globalAlpha = hovered_t * 0.2;
      ctx.fillStyle = "white";
      ctx.fillRect(
        x + state.theme.borderSize,
        y + state.theme.borderSize,
        width - state.theme.borderSize * 2,
        height - state.theme.borderSize * 2,
      );
      ctx.restore();
    }

    ctx.font = state.theme.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + height / 2);
  }

  if (hovered) {
    state.hovered = id;
    state.cursor = "pointer";
    if (state.mouse.justClicked) {
      state.persisted.get(id)!.hovered_t = 0;
      return true;
    }
  }
  return false;
}

type Pointer<T> = { get: () => T; set: (v: T) => void };
export function ref<O extends object, K extends keyof O>(
  obj: O,
  key: K,
): Pointer<O[K]> {
  return {
    get: () => obj[key],
    set: (v: O[K]) => {
      obj[key] = v;
    },
  };
}

export function checkbox(
  label: string,
  x: number,
  y: number,
  size: number,
  pointerValue: Pointer<boolean>,
) {
  const id = `checkbox-${label}`;
  register(id, x, y, size, size);

  const hovered = state.hovered === id;
  if (hovered) {
    state.cursor = "pointer";
  }
  const clicked = hovered && state.mouse.justClicked;
  const prevChecked = pointerValue.get();
  if (clicked) {
    pointerValue.set(!prevChecked);
    state.persisted.get(id)!.hovered_t = 0;
  }
  const checked = pointerValue.get();

  const ctx = state.ctx;
  if (ctx) {
    ctx.fillStyle = state.theme.borderColor;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = state.theme.elementBackground;
    ctx.fillRect(
      x + state.theme.borderSize,
      y + state.theme.borderSize,
      size - state.theme.borderSize * 2,
      size - state.theme.borderSize * 2,
    );
    const hovered_t = state.persisted.get(id)?.hovered_t || 0;
    ctx.save();
    ctx.globalAlpha = hovered_t * 0.2;
    ctx.fillStyle = "white";
    ctx.fillRect(
      x + state.theme.borderSize,
      y + state.theme.borderSize,
      size - state.theme.borderSize * 2,
      size - state.theme.borderSize * 2,
    );
    ctx.restore();
    if (checked) {
      ctx.fillStyle = state.theme.textColor;
      ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6);
    }
    ctx.fillStyle = state.theme.textColor;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + size + 8, y + size / 2);
  }
}

const windowTopBarHeight = 32;
function windowContentSpace(id: string) {
  const window = state.windowPersistent.get(id)!;
  return {
    x: window.x + state.theme.borderSize,
    y: window.y + windowTopBarHeight + state.theme.borderSize,
    width: window.width,
    height: window.height,
  };
}

export function window(
  title: string,
  initX: number,
  initY: number,
  initWidth: number,
  initHeight: number,
  innerUi: () => void,
) {
  const id = `window-${title}`;
  state.frame.windows.push({
    id,
    tick: () => {
      // register window
      if (!state.windowPersistent.has(id)) {
        state.windowPersistent.set(id, {
          x: initX,
          y: initY,
          width: initWidth,
          height: initHeight,
          z: ++state.windowZ,
        });
      }
      {
        const { x, y, width, height } = state.windowPersistent.get(id)!;
        register(id, x, y, width, height + windowTopBarHeight);
        const hovered = state.hovered === id;
        const dragging = state.dragging === id;
        const resizing = state.resizing === id;
        if (dragging) {
          if (state.mouse.down === false) {
            state.dragging = null;
          } else {
            const newX = x + state.mouse.dx;
            const newY = y + state.mouse.dy;
            state.windowPersistent.set(id, {
              x: newX,
              y: newY,
              width,
              height,
              z: ++state.windowZ,
            });
          }
          state.cursor = "grabbing";
        } else if (hovered) {
          if (state.mouse.justClicked) {
            state.dragging = id;
          }
          state.cursor = "grab";
        } else if (resizing) {
          if (state.mouse.down === false) {
            state.resizing = null;
          } else {
            const newWidth = Math.max(100, width + state.mouse.dx);
            const newHeight = Math.max(50, height + state.mouse.dy);
            state.windowPersistent.set(id, {
              x,
              y,
              width: newWidth,
              height: newHeight,
              z: ++state.windowZ,
            });
          }
        }
      }

      // get updated window state
      const { x, y, width, height } = state.windowPersistent.get(id)!;

      const ctx = state.ctx;
      if (ctx) {
        const contentRect = windowContentSpace(id);
        {
          // cut out content rect so it can be transparent
          ctx.save();
          ctx.beginPath();
          ctx.rect(
            contentRect.x,
            contentRect.y,
            contentRect.width,
            contentRect.height,
          );
          ctx.rect(
            x,
            y,
            width + state.theme.borderSize * 2,
            height + windowTopBarHeight + state.theme.borderSize * 2,
          );
          ctx.clip("evenodd");

          ctx.fillStyle = state.theme.borderColor;
          ctx.fillRect(
            x,
            y,
            width + state.theme.borderSize * 2,
            height + windowTopBarHeight + state.theme.borderSize * 2,
          );
          ctx.restore();
        }
        ctx.fillStyle = state.theme.elementBackground;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(
          contentRect.x,
          contentRect.y,
          contentRect.width,
          contentRect.height,
        );
        ctx.globalAlpha = 1;
        ctx.fillStyle = state.theme.textColor;
        ctx.font = state.theme.font;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(title, x + 8, y + windowTopBarHeight / 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(
          contentRect.x,
          contentRect.y,
          contentRect.width,
          contentRect.height,
        );
        ctx.clip();
        ctx.translate(
          x + state.theme.borderSize,
          y + windowTopBarHeight + state.theme.borderSize,
        );
        state.inWindow = id;
        innerUi();
        const resizeButtonSize = 20;
        const buttonId = `window-resize-${id}`;
        if (
          button(
            "⇲",
            width - resizeButtonSize + state.theme.borderSize,
            height - resizeButtonSize + state.theme.borderSize,
            resizeButtonSize,
            resizeButtonSize,
            buttonId,
          )
        ) {
          state.resizing = id;
        }
        state.inWindow = null;
        if (state.resizing === id || state.hovered === buttonId) {
          state.cursor = "nwse-resize";
        }
        ctx.restore();
      }
    },
  });
}

export function start(ctx: CanvasRenderingContext2D) {
  state.ctx = ctx;
  state.mouse.dx = state.mouse.x - state.mouse.prevx;
  state.mouse.dy = state.mouse.y - state.mouse.prevy;
}

export function end(dt: number) {
  // sort windows by z
  state.frame.windows.sort((a, b) => {
    const az = state.windowPersistent.get(a.id)?.z || 0;
    const bz = state.windowPersistent.get(b.id)?.z || 0;
    return az - bz;
  });
  state.frame.windows.forEach((w) => w.tick());
  state.frame.windows = [];

  // apply cursor
  const canvas = state.ctx?.canvas;
  if (canvas) {
    canvas.style.cursor = state.cursor;
  }
  state.cursor = "default";

  state.hovered = state.nextHovered;
  state.nextHovered = null;
  state.mouse.justClicked = false;
  state.mouse.prevx = state.mouse.x;
  state.mouse.prevy = state.mouse.y;

  // TODO: purge old entries
  state.persisted.forEach((entry, id) => {
    const target_hovered = state.hovered === id ? 1 : 0;
    const smoothing = 0.01;
    entry.hovered_t = lerp(
      entry.hovered_t,
      target_hovered,
      1 - Math.exp(-smoothing * dt),
    );
  });
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
