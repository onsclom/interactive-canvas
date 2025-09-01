// import { tick } from "./demo";
// import { tick } from "./clock-game";
import { tick } from "./draw-tool";
import * as Input from "./input";

import { startLoop } from "./canvas-render-loop";
import { registerInputListeners } from "./input";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

startLoop(canvas, tick);
registerInputListeners(canvas);
