import { createServer } from "node:http";
import { Bot, session, webhookCallback } from "grammy";
import {
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { getDb } from "@eth/db";
import { env } from "./env.js";
import type { BotContext, InsideContext, SessionData } from "./context.js";
import {
  createPgConversationStorage,
  createPgSessionStorage,
} from "./session-storage.js";
import { authMiddleware } from "./middleware/auth.js";
import { idempotencyMiddleware } from "./middleware/idempotency.js";
import { startCommand } from "./commands/start.js";
import { myCommand } from "./commands/my.js";
import { weekCommand } from "./commands/week.js";
import { tasksCommand } from "./commands/tasks.js";
import { doneCommand } from "./commands/done.js";
import { approveCommand, rejectCommand } from "./commands/approve.js";
import { inviteCommand } from "./commands/invite.js";
import { reportCommand } from "./commands/report.js";
import { promoteCommand, demoteCommand } from "./commands/promote.js";
import { addConversation } from "./conversations/add.js";
import { assignConversation } from "./conversations/assign.js";
import { submitConversation } from "./conversations/submit.js";
import { projectConversation } from "./conversations/project.js";
import { handleCallbacks } from "./callbacks.js";
import { createInjectMiddleware } from "./middleware/inject.js";
import { earningsCommand } from "./commands/earnings.js";
import { invoiceCommand, invoicesCommand } from "./commands/invoices.js";

const db = getDb(env.databaseUrl);
const inject = createInjectMiddleware(db);

const bot = new Bot<BotContext>(env.botToken);

bot.use(inject);
bot.use(idempotencyMiddleware);
bot.use(
  session({
    initial: (): SessionData => ({}),
    storage: createPgSessionStorage(db),
  }),
);
bot.use(
  conversations({
    storage: {
      type: "key",
      adapter: createPgConversationStorage(db),
    },
    plugins: [inject],
  }),
);

bot.use(
  createConversation<BotContext, InsideContext>(addConversation, {
    id: "add",
    plugins: [inject],
  }),
);
bot.use(
  createConversation<BotContext, InsideContext>(assignConversation, {
    id: "assign",
    plugins: [inject],
  }),
);
bot.use(
  createConversation<BotContext, InsideContext>(
    async (conversation, ctx, presetShortCode?: string) =>
      submitConversation(conversation, ctx, presetShortCode),
    { id: "submit", plugins: [inject] },
  ),
);
bot.use(
  createConversation<BotContext, InsideContext>(projectConversation, {
    id: "project",
    plugins: [inject],
  }),
);

bot.use(authMiddleware);

bot.command("start", startCommand);
bot.command("my", myCommand);
bot.command("week", weekCommand);
bot.command("tasks", tasksCommand);
bot.command("done", doneCommand);
bot.command("approve", approveCommand);
bot.command("reject", rejectCommand);
bot.command("invite", inviteCommand);
bot.command("report", reportCommand);
bot.command("promote", promoteCommand);
bot.command("demote", demoteCommand);
bot.command("earnings", earningsCommand);
bot.command("invoices", invoicesCommand);
bot.command("invoice", invoiceCommand);

bot.command("add", async (ctx) => {
  await ctx.conversation.enter("add");
});
bot.command("assign", async (ctx) => {
  await ctx.conversation.enter("assign");
});
bot.command("submit", async (ctx) => {
  const parts = ctx.message?.text?.trim().split(/\s+/) ?? [];
  const code = parts[1]?.trim().toUpperCase();
  await ctx.conversation.enter("submit", code || undefined);
});
bot.command("project", async (ctx) => {
  await ctx.conversation.enter("project");
});

bot.callbackQuery(/^submit_pick:/, async (ctx) => {
  const code = ctx.callbackQuery.data.split(":")[1];
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("submit", code);
});

bot.on("callback_query:data", handleCallbacks);

bot.catch((err) => {
  console.error("Bot error", err.error);
});

async function main() {
  if (env.botMode === "webhook") {
    const handler = webhookCallback(bot, "http", {
      secretToken: env.webhookSecret || undefined,
    });
    const server = createServer((req, res) => {
      if (req.url === "/telegram/webhook" && req.method === "POST") {
        const secret = req.headers["x-telegram-bot-api-secret-token"];
        if (env.webhookSecret && secret !== env.webhookSecret) {
          res.writeHead(401);
          res.end("unauthorized");
          return;
        }
        void handler(req, res);
        return;
      }
      if (req.url === "/health") {
        res.writeHead(200);
        res.end("ok");
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });
    server.listen(env.port, () => {
      console.log(`Bot webhook on :${env.port}`);
    });
  } else {
    console.log("Bot starting in long-polling mode…");
    await bot.start({
      onStart: (info) => console.log(`@${info.username} polling`),
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
