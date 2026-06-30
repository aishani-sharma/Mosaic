import { spawn } from "node:child_process";

function run(command, args, options = {}) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      stdio: "inherit",
      ...options,
    });
  }

  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
}

const processes = [
  run("npm", ["run", "dev:ui"]),
  run("node", ["server.mjs"], {
    env: { ...process.env, PORT: process.env.PORT || "8081" },
  }),
];

function stopAll() {
  for (const processRef of processes) {
    if (!processRef.killed) {
      processRef.kill();
    }
  }
}

for (const processRef of processes) {
  processRef.on("exit", (code) => {
    stopAll();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
