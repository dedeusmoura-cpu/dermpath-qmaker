import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  stem: text("stem").notNull(),
  options: text("options").notNull(),
  imageUrl: text("image_url"),
  correctAnswer: integer("correct_answer").notNull(),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  answerIndex: integer("answer_index").notNull(),
  deviceId: text("device_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
