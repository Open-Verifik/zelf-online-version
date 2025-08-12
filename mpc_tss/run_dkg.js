#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { session: `mpc_tss_${Date.now()}`, n: 3, k: 2 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" && args[i + 1]) out.session = args[++i];
    else if (args[i] === "--n" && args[i + 1]) out.n = parseInt(args[++i]);
    else if (args[i] === "--k" && args[i + 1]) out.k = parseInt(args[++i]);
  }
  return out;
}

async function run() {
  const { session, n, k } = parseArgs();
  const cwd = __dirname;

  const env = {
    ...process.env,
    MPC_SESSION_ID: session,
    MPC_TOTAL_PARTIES: String(n),
    MPC_THRESHOLD: String(k),
  };

  const coordinator = spawn("node", ["coordinator.js"], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  coordinator.stdout.on("data", (d) => process.stdout.write(`[COORD] ${d}`));
  coordinator.stderr.on("data", (d) => process.stderr.write(`[COORD ERR] ${d}`));

  await new Promise((r) => setTimeout(r, 600));

  const procs = [];
  for (let i = 0; i < n; i++) {
    const p = spawn("node", ["party.js", String(i)], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.on("data", (d) => process.stdout.write(`[PARTY ${i}] ${d}`));
    p.stderr.on("data", (d) => process.stderr.write(`[PARTY ${i} ERR] ${d}`));
    procs.push(p);
  }

  // allow DKG to finish and group key to be printed
  await new Promise((r) => setTimeout(r, 3000));

  coordinator.kill();
  procs.forEach((p) => p.kill());
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


