"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./vote.module.css";

type Question = { id: number; title: string; stem: string; kind: "choice" | "open"; options: string[]; correctAnswer: number; imageUrl?: string | null; responseCount?: number };
type Word = { text: string; count: number };
type Results = { question: Question; counts?: number[]; answers?: Word[]; total: number };
type Language = "pt" | "en";

const letters = ["a", "b", "c", "d", "e", "f"];
const dermPathUrl = "https://dermpath-navigator.vercel.app/";

function AppHeader({ home, onBack, language, setLanguage }: { home?: boolean; onBack?: () => void; language: Language; setLanguage: (language: Language) => void }) {
  return <header className={styles.appHeader}>
    <a className={styles.brand} href="/" aria-label="Ir para a página inicial do DermPath QMaker"><img src="/dermpath-quiz-logo.png" alt="DermPath QMaker" /><span><strong><span className={styles.derm}>Derm</span><span className={styles.path}>Path</span> <em className={styles.qMaker}>Q<span>M</span><span>a</span><span>k</span><span>e</span><span>r</span></em></strong></span></a>
    <nav className={styles.appControls} aria-label="Navegação do quiz">
      <a className={styles.dermPathBrand} href={dermPathUrl} aria-label="Abrir DermPath Navigator"><img src="/dermpath-navigator-logo.png" alt="DermPath Navigator" /></a>
      {!home && <button className={styles.back} onClick={onBack}>← {language === "pt" ? "Voltar" : "Back"}</button>}
      <div className={styles.language} aria-label="Idioma">
        <button className={language === "pt" ? styles.activeLanguage : ""} onClick={() => setLanguage("pt")}>PT</button>
        <button className={language === "en" ? styles.activeLanguage : ""} onClick={() => setLanguage("en")}>EN</button>
      </div>
    </nav>
  </header>;
}

function deviceId() { const key = "votacoes-clinicas-device"; let id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id; }

function BubbleCloud({ answers }: { answers: Word[] }) {
  const max = Math.max(...answers.map((answer) => answer.count), 1);
  return <div className={styles.cloud}>{answers.map((answer, index) => {
    const ratio = answer.count / max; const angle = index * 2.4; const radius = (1 - ratio) * 32 + (index % 3) * 5;
    return <div className={styles.bubble} key={answer.text} style={{ fontSize: `${15 + ratio * 27}px`, left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius * .72}%`, zIndex: Math.round(ratio * 10) }}><b>{answer.text}</b><small>{answer.count}</small></div>;
  })}</div>;
}

export default function Home() {
  const [mode, setMode] = useState<"home" | "new" | "vote" | "panel">("home");
  const [language, setLanguage] = useState<Language>("pt");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", stem: "", imageUrl: "", kind: "choice" as "choice" | "open", options: ["", "", "", ""], correctAnswer: 0 });
  const query = useMemo(() => typeof window !== "undefined" ? new URLSearchParams(location.search) : null, []);
  const id = query?.get("q"); const panel = query?.get("painel") === "1";
  const en = language === "en";

  const load = useCallback(async () => { const response = await fetch("/api/questions"); if (response.ok) setQuestions((await response.json()).questions); }, []);
  const loadQuestion = useCallback(async (questionId: string) => { const response = await fetch(`/api/questions/${questionId}`); if (response.ok) setQuestion((await response.json()).question); }, []);
  const loadResults = useCallback(async (questionId: string) => { const response = await fetch(`/api/questions/${questionId}/results`); if (response.ok) { const data = await response.json(); setResults(data); setQuestion(data.question); } }, []);
  useEffect(() => { if (id) { setMode(panel ? "panel" : "vote"); panel ? loadResults(id) : loadQuestion(id); } else load(); }, [id, panel, load, loadQuestion, loadResults]);
  useEffect(() => { if (!panel || !id) return; const timer = setInterval(() => loadResults(id), 5000); return () => clearInterval(timer); }, [id, panel, loadResults]);

  async function create(event: FormEvent) { event.preventDefault(); const response = await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) return setMessage(data.error); location.href = `?q=${data.question.id}&painel=1`; }
  async function vote() { if (!id || (question?.kind === "choice" && selected === null) || (question?.kind === "open" && !openAnswer.trim())) return; const response = await fetch(`/api/questions/${id}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answerIndex: selected, answerText: openAnswer, deviceId: deviceId() }) }); const data = await response.json(); setMessage(response.ok ? "Resposta registrada! Aguarde a discussão da turma." : data.error); }
  async function reset() { if (id && confirm("Zerar todas as respostas desta questão?")) { await fetch(`/api/questions/${id}/results`, { method: "DELETE" }); loadResults(id); } }
  const goHome = () => { location.href = location.pathname; };

  if (mode === "new") return <main className={styles.shell}><AppHeader language={language} setLanguage={setLanguage} onBack={() => setMode("home")} /><section className={styles.card}><header><span className={styles.kicker}>{en ? "NEW QUESTION" : "NOVA QUESTÃO"}</span></header><form className={styles.form} onSubmit={create}>
    <label>{en ? "Format" : "Formato"}<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as "choice" | "open" })}><option value="choice">{en ? "Multiple choice" : "Múltipla escolha"}</option><option value="open">{en ? "Open response" : "Resposta aberta"}</option></select></label>
    <label>{en ? "Short title" : "Título curto"}<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>{en ? "Question stem" : "Enunciado"}<textarea required value={form.stem} onChange={(event) => setForm({ ...form, stem: event.target.value })} /></label><label>{en ? "Image URL (optional)" : "URL da imagem (opcional)"}<input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
    {form.kind === "choice" && <fieldset><legend>{en ? "Options and correct answer" : "Alternativas e resposta correta"}</legend>{form.options.map((option, index) => <div className={styles.optionInput} key={index}><input type="radio" name="correct" checked={form.correctAnswer === index} onChange={() => setForm({ ...form, correctAnswer: index })} /><span>{letters[index]})</span><input required value={option} onChange={(event) => { const options = [...form.options]; options[index] = event.target.value; setForm({ ...form, options }); }} /></div>)}</fieldset>}
    {form.kind === "open" && <p className={styles.helper}>{en ? "Students will send a short response. The panel groups identical answers." : "Os alunos enviarão uma resposta curta. O painel agrupará respostas idênticas, sem diferenciar maiúsculas e minúsculas."}</p>}<button className={styles.primary}>{en ? "Create question and QR Code" : "Criar questão e QR Code"}</button>{message && <p className={styles.error}>{message}</p>}
  </form></section></main>;

  if (mode === "panel" && results) { const url = `${location.origin}?q=${results.question.id}`; return <main className={styles.shell}><AppHeader language={language} setLanguage={setLanguage} onBack={goHome} /><section className={styles.dashboard}><header><div><span className={styles.kicker}>{en ? "TEACHER PANEL" : "PAINEL DO PROFESSOR"} · {results.question.kind === "open" ? (en ? "OPEN RESPONSE" : "RESPOSTA ABERTA") : (en ? "MULTIPLE CHOICE" : "MÚLTIPLA ESCOLHA")}</span><h1>{results.question.title}</h1><p>{en ? "Updates automatically every 5 seconds." : "Atualiza automaticamente a cada 5 segundos."}</p></div><div className={styles.actions}><button className={styles.danger} onClick={reset}>{en ? "Reset votes" : "Zerar votação"}</button><b className={styles.total}>{results.total}<small>{en ? "answers" : "respostas"}</small></b></div></header><div className={styles.grid}><aside className={styles.qr}><span className={styles.kicker}>{en ? "CLASSROOM ENTRY" : "ENTRADA DA TURMA"}</span><img src={`https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(url)}`} alt="QR Code" /><code>{url}</code></aside><article className={styles.results}><span className={styles.kicker}>{results.question.kind === "open" ? (en ? "ANSWER CLOUD" : "NUVEM DE RESPOSTAS") : (en ? "DISTRIBUTION" : "DISTRIBUIÇÃO")}</span>{results.question.kind === "open" ? <BubbleCloud answers={results.answers ?? []} /> : results.question.options.map((option, index) => { const count = results.counts?.[index] ?? 0; const percentage = results.total ? Math.round(count / results.total * 100) : 0; return <div className={styles.bar} key={option}><div><b>{letters[index]}) {option}</b><span>{count} · {percentage}%</span></div><i><em className={index === results.question.correctAnswer ? styles.correct : ""} style={{ width: `${percentage}%` }} /></i></div>; })}</article></div></section></main>; }

  if (mode === "vote" && question) return <main className={styles.shell}><AppHeader language={language} setLanguage={setLanguage} onBack={goHome} /><section className={styles.card}><header><span className={styles.kicker}>DERMPATH QMAKER</span><span>Dermatopatologia</span></header><article className={styles.question}><h1>{question.title}</h1><p>{question.stem}</p>{question.imageUrl && <img className={styles.micrograph} src={question.imageUrl} alt="Imagem da questão" />}{question.kind === "open" ? <textarea className={styles.openAnswer} maxLength={180} disabled={message.startsWith("Resposta")} value={openAnswer} onChange={(event) => setOpenAnswer(event.target.value)} placeholder={en ? "Write a short response…" : "Escreva uma resposta curta…"} /> : <div className={styles.choices}>{question.options.map((option, index) => <button disabled={message.startsWith("Resposta")} className={selected === index ? styles.selected : ""} onClick={() => { setSelected(index); setMessage(""); }} key={option}><b>{letters[index]}</b>{option}</button>)}</div>}<button className={styles.primary} onClick={vote}>{en ? "Submit answer" : "Confirmar resposta"}</button>{message && <p className={message.startsWith("Resposta") ? styles.success : styles.error}>{message}</p>}</article></section></main>;

  return <main className={styles.shell}><AppHeader home language={language} setLanguage={setLanguage} /><section className={styles.dashboard}><header><div><span className={styles.kicker}>DERMPATH QMAKER</span><h1>{en ? "Questions that engage the class." : "Questões que envolvem a turma."}</h1><p>{en ? "Create a question, project the QR code, and follow the distribution." : "Crie uma pergunta, projete o QR Code e acompanhe a distribuição."}</p></div><button className={styles.primary} onClick={() => setMode("new")}>{en ? "+ Create quiz" : "+ Criar quiz"}</button></header><div className={styles.list}>{questions.length ? questions.map((item) => { const responseCount = item.responseCount ?? 0; const type = item.kind === "open" ? (en ? "OPEN RESPONSE" : "RESPOSTA ABERTA") : (en ? "MULTIPLE CHOICE" : "MÚLTIPLA ESCOLHA"); const answerLabel = en ? (responseCount === 1 ? "answer" : "answers") : (responseCount === 1 ? "resposta" : "respostas"); return <a key={item.id} href={`?q=${item.id}&painel=1`}><div className={styles.questionCardMain}><span className={styles.questionType}>{type}</span><b>{item.title}</b><small>{en ? "Quiz" : "Questão"} {item.id} · {responseCount} {answerLabel}</small></div><span className={styles.cardArrow} aria-hidden="true">→</span></a>; }) : <div className={styles.empty}>{en ? "There are no questions yet. Create the first one to begin." : "Ainda não há questões. Crie a primeira para começar."}</div>}</div></section></main>;
}
