import { canvas } from "./canvas";
import { tick } from "./game";
import { startLoop } from "./canvas-render-loop";

startLoop(canvas, tick);
