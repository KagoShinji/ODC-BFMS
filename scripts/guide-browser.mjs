import fs from "node:fs/promises";

// Connect only to a dedicated, disposable browser profile (see docs/user-guide/README.md).
export async function guideBrowser() {
  const port = process.env.GUIDE_BROWSER_PORT || "9341";
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = pages.find((page) => page.type === "page");
  if (!target) throw new Error("Open a blank tab in the guide capture browser first.");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const result = JSON.parse(event.data);
    const request = pending.get(result.id);
    if (!request) return;
    pending.delete(result.id);
    clearTimeout(request.timer);
    if (result.error) request.reject(new Error(JSON.stringify(result.error)));
    else request.resolve(result.result);
  };
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 60000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    for (let attempt = 0; attempt < 200; attempt++) {
      try {
        if (await evaluate(expression)) return;
      } catch (error) {
        if (!/navigated|context.*destroyed|Cannot find context/i.test(error.message)) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Screen did not become ready: ${expression}`);
  }
  async function screenshot(path) {
    await evaluate("document.fonts.ready.then(() => true)");
    await evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))");
    const result = await call("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(path, Buffer.from(result.data, "base64"));
  }
  await call("Page.enable");
  return { call, evaluate, until, screenshot, close: () => socket.close() };
}
