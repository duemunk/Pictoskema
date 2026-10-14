// Encrypts everything personal into sealed.json with the 6-digit code from
// private/unlock-code.txt. Plain values live only in private/personal.json (gitignored),
// keyed by the name used in the page's data-private="<key>" attributes.
// Run before every commit that touches personal details: node tools/seal.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const ITERATIONS = 300000;
const code = readFileSync("private/unlock-code.txt", "utf8").trim();
const personal = JSON.parse(readFileSync("private/personal.json", "utf8"));
let previous;
try { previous = JSON.parse(readFileSync("sealed.json", "utf8")); } catch { previous = null; }

const toBase64 = (bytes) => Buffer.from(bytes).toString("base64");
const fromBase64 = (text) => new Uint8Array(Buffer.from(text, "base64"));

const salt = previous ? fromBase64(previous.salt) : crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, base, 256);
const key = await crypto.subtle.importKey("raw", bits, "AES-GCM", false, ["encrypt"]);

async function encrypt(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

const values = {};
for (const name of Object.keys(personal).sort()) values[name] = await encrypt(personal[name]);
writeFileSync("sealed.json", JSON.stringify({ salt: toBase64(salt), iterations: ITERATIONS, check: await encrypt("pictoskema"), values }, null, 2) + "\n");
console.log("Sealed " + Object.keys(values).length + " values");
