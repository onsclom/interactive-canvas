import { tick } from "./game";
import { startLoop } from "./canvas-render-loop";
import { registerInputListeners } from "./input";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

startLoop(canvas, tick);
registerInputListeners(canvas);
