// Administrator-only provisioning. Never import this module from browser code.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const env = Object.fromEntries(
  (await readFile(".env", "utf8"))
    .split(/\r?\n/)
    .filter((x) => x.includes("="))
    .map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)]),
);
const keyFile = process.argv.includes("--key-file") ? arg("--key-file") : null;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (keyFile ? (await readFile(keyFile, "utf8")).trim() : "");
// Require the service-role key before provisioning privileged demo accounts.
if (!key)
  throw new Error(
    "Provide SUPABASE_SERVICE_ROLE_KEY or --key-file. Never use a privileged key in VITE_ settings.",
  );
const client = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
// Stop when the existing-user lookup fails.
if (error) throw error;
const names = ["Alice", "Bob", "Charlie", "Dana"];
const password = randomBytes(18).toString("base64url") + "aA9!";
const lines = [
  "CS4353 demo accounts — local prototype only",
  "",
  "Sign in at http://localhost:3000",
  "",
];
for (const name of names) {
  const email = `${name.toLowerCase()}@cs4353.example.test`;
  const existing = data.users.find((u) => u.email === email);
  // Update an existing demo account rather than create a duplicate email.
  if (existing) {
    lines.push(`${name}: ${email} (existing account; password unchanged)`);
    continue;
  }
  const result = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  // Propagate account-creation errors instead of reporting a seeded user.
  if (result.error) throw result.error;
  const update = await client
    .from("profiles")
    .update({ username: name.toLowerCase() })
    .eq("id", result.data.user.id);
  // Propagate account-update errors instead of reporting success.
  if (update.error) throw update.error;
  lines.push(`${name}: ${email}\nPassword: ${password}\n`);
}
const output = process.argv.includes("--output")
  ? arg("--output")
  : ".demo-accounts.txt";
await writeFile(output, lines.join("\n") + "\n", { mode: 0o600 });
await chmod(output, 0o600);
console.log(
  `Demo accounts provisioned. Credentials saved privately to ${output}.`,
);
