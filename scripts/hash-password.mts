import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";

const rl = createInterface({ input: process.stdin, terminal: false });
let line: string | undefined;
rl.on("line", (l) => {
  if (line === undefined) line = l;
});
rl.on("close", async () => {
  if (!line) {
    console.error("Usage: printf '%s' 'your password' | node scripts/hash-password.mts");
    process.exit(1);
  }
  const hash = await bcrypt.hash(line, 12);
  console.log(hash);
});
