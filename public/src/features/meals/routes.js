import { registerRoute } from "../../core/router.js";

registerRoute("/meals", async () => {
  const view = await import("./view.js");
  return view.default();
});

registerRoute("/nutrition", async () => {
  const view = await import("./view.js");
  return view.default();
});

