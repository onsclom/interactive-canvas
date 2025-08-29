import { tick } from "./demo";
import { startLoop } from "./canvas-render-loop";
import { registerInputListeners } from "./input";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

startLoop(canvas, tick);
registerInputListeners(canvas);
