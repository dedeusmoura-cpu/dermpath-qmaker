import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  stem: text("stem").notNull(),
  kind: text("kind", { enum: ["choice", "cloud", "open"] }).notNull().default("choice"),
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
  answerText: text("answer_text"),
  deviceId: text("device_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("vote_question_device_unique").on(table.questionId, table.deviceId)]);

export const challenges = sqliteTable("challenges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const challengeQuestions = sqliteTable("challenge_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
}, (table) => [uniqueIndex("challenge_question_unique").on(table.challengeId, table.questionId), index("challenge_question_position").on(table.challengeId, table.position)]);

export const challengeParticipants = sqliteTable("challenge_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  alias: text("alias").notNull(),
  token: text("token").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("challenge_participant_token_unique").on(table.token), index("challenge_participant_challenge").on(table.challengeId)]);

export const challengeAnswers = sqliteTable("challenge_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => challengeParticipants.id, { onDelete: "cascade" }),
  answerIndex: integer("answer_index").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("challenge_answer_unique").on(table.participantId, table.questionId), index("challenge_answer_score").on(table.challengeId, table.participantId)]);
