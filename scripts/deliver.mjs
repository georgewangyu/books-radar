import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const userDir = path.join(homedir(), ".books-radar");

function parseEnv(raw) {
  const env = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return env;
}

async function readUserEnv() {
  try {
    return parseEnv(await readFile(path.join(userDir, ".env"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function readConfig() {
  try {
    return JSON.parse(await readFile(path.join(userDir, "config.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { delivery: { method: "stdout" } };
    }

    throw error;
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function splitTelegram(text) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, 3900));
    remaining = remaining.slice(3900);
  }

  return chunks;
}

async function sendTelegram(text, token, chatId) {
  for (const chunk of splitTelegram(text)) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        parse_mode: "Markdown",
        text: chunk,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Telegram API error: ${body.description || response.statusText}`);
    }
  }
}

async function sendEmail(text, apiKey, to) {
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: "George's Books Radar <digest@resend.dev>",
      subject: "George's Books Radar digest",
      text,
      to,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error: ${body}`);
  }
}

async function main() {
  const file = argValue("--file");

  if (!file) {
    throw new Error("Usage: node scripts/deliver.mjs --file /path/to/digest.txt");
  }

  const [text, config, env] = await Promise.all([readFile(file, "utf8"), readConfig(), readUserEnv()]);
  const method = config.delivery?.method || "stdout";

  if (!text.trim()) {
    console.log(JSON.stringify({ status: "skipped", reason: "Empty digest text" }));
    return;
  }

  if (method === "telegram") {
    if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not found in ~/.books-radar/.env");
    if (!config.delivery?.chatId) throw new Error("delivery.chatId not found in ~/.books-radar/config.json");
    await sendTelegram(text, env.TELEGRAM_BOT_TOKEN, config.delivery.chatId);
  } else if (method === "email") {
    if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not found in ~/.books-radar/.env");
    if (!config.delivery?.email) throw new Error("delivery.email not found in ~/.books-radar/config.json");
    await sendEmail(text, env.RESEND_API_KEY, config.delivery.email);
  } else {
    process.stdout.write(text);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
