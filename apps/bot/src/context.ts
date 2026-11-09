import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";
import type { User, Db } from "@eth/db";

export type SessionData = Record<string, never>;

type BaseContext = Context &
  SessionFlavor<SessionData> & {
    db: Db;
    user: User | null;
  };

/** Context used outside conversations */
export type BotContext = ConversationFlavor<BaseContext>;

/** Context used inside conversations (no ConversationFlavor) */
export type InsideContext = Context & {
  db: Db;
  user: User | null;
};
