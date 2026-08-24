"use client";

import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./vote.module.css";

type Question = {
  id: number;
  title: string;
  stem: string;
  kind: "choice" | "cloud" | "open";
  options: string[];
  correctAnswer: number;
  imageUrl?: string | null;
  responseCount?: number;
};
type Word = { text: string; count: number };
type Results = {
  question: Question;
  counts?: number[];
  answers?: Word[];
  total: number;
};
type Language = "pt" | "en";
type ChallengeQuestion = Question & { position: number };
type Challenge = {
  id: number;
  title: string;
  createdAt: string;
  questions: ChallengeQuestion[];
};
type ChallengeResults = {
  challenge: { id: number; title: string };
  totalQuestions: number;
  ranking: { alias: string; correct: number; answered: number }[];
  distribution: {
    question: ChallengeQuestion;
    counts: number[];
    total: number;
  }[];
};

const letters = ["a", "b", "c", "d", "e", "f"];
const dermPathUrl = "https://dermpath-navigator.vercel.app/";

function AppHeader({
  home,
  onBack,
  onHistory,
  language,
  setLanguage,
}: {
  home?: boolean;
  onBack?: () => void;
  onHistory?: () => void;
  language: Language;
  setLanguage: (language: Language) => void;
}) {
  return (
    <header className={styles.appHeader}>
      <a
        className={styles.brand}
        href="/"
        aria-label="Ir para a página inicial do DermPath QMaker"
      >
        <img src="/dermpath-quiz-logo.png" alt="DermPath QMaker" />
        <span>
          <strong>
            <span className={styles.derm}>Derm</span>
            <span className={styles.path}>Path</span>{" "}
            <em className={styles.qMaker}>
              Q<span>M</span>
              <span>a</span>
              <span>k</span>
              <span>e</span>
              <span>r</span>
            </em>
          </strong>
        </span>
      </a>
      <nav className={styles.appControls} aria-label="Navegação do quiz">
        <a
          className={styles.dermPathBrand}
          href={dermPathUrl}
          aria-label="Abrir DermPath Navigator"
        >
          <img src="/dermpath-navigator-logo.png" alt="DermPath Navigator" />
        </a>
        {onHistory && (
          <button className={styles.back} onClick={onHistory}>
            {language === "pt" ? "Histórico" : "History"}
          </button>
        )}
        {!home && (
          <button className={styles.back} onClick={onBack}>
            ← {language === "pt" ? "Voltar" : "Back"}
          </button>
        )}
        <div className={styles.language} aria-label="Idioma">
          <button
            className={language === "pt" ? styles.activeLanguage : ""}
            onClick={() => setLanguage("pt")}
          >
            PT
          </button>
          <button
            className={language === "en" ? styles.activeLanguage : ""}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </nav>
    </header>
  );
}

const teacherPinKey = "qmaker-teacher-pin";

// Attaches the teacher PIN (prompting once and remembering it) to write
// actions that only the teacher should be able to trigger. If the server
// rejects the PIN, forgets it locally so the next attempt prompts again.
async function teacherFetch(
  url: string,
  options: RequestInit,
  en: boolean,
): Promise<Response> {
  let pin = localStorage.getItem(teacherPinKey);
  if (!pin) {
    pin =
      prompt(en ? "Enter the teacher PIN:" : "Digite o PIN de professor:") ??
      "";
    if (pin) localStorage.setItem(teacherPinKey, pin);
  }
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers ?? {}), "x-teacher-pin": pin },
  });
  if (response.status === 401) localStorage.removeItem(teacherPinKey);
  return response;
}

// A single line-icon style (stroke only, rounded caps) shared by all three
// quiz formats, instead of three unrelated visual languages (dot/line grid,
// hand-drawn italic letters, filled chat bubble).
const formatIconPaths = {
  choice: (
    <>
      <circle cx="4.5" cy="6" r="1.4" />
      <circle cx="4.5" cy="12" r="1.4" />
      <circle cx="4.5" cy="18" r="1.4" />
      <line x1="9.5" y1="6" x2="20" y2="6" />
      <line x1="9.5" y1="12" x2="20" y2="12" />
      <line x1="9.5" y1="18" x2="20" y2="18" />
    </>
  ),
  cloud: (
    <path d="M7.5 18h9.5a3.6 3.6 0 0 0 .4-7.18A5 5 0 0 0 7.6 8.9 3.6 3.6 0 0 0 7.5 18z" />
  ),
  open: <path d="M4 5.5h16v10.5H9.5L5.5 20v-4H4z" />,
  trophy: (
    <path d="M7 4h10v5.5a5 5 0 0 1-10 0V4Zm0 2H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M12 14v4M8.5 20h7" />
  ),
} as const;

function FormatIcon({ kind }: { kind: "choice" | "cloud" | "open" | "trophy" }) {
  return (
    <svg
      className={styles.formatIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {formatIconPaths[kind]}
    </svg>
  );
}

function QrPanel({ url, panelUrl, alt, en }: { url: string; panelUrl: string; alt: string; en: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Some browsers/contexts deny the async Clipboard API (permissions
      // policy, insecure origin). Fall back to the older selection-based copy.
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        ok = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }
  return (
    <aside className={styles.qr}>
      <span className={styles.kicker}>
        {en ? "QR CODE TO RESPOND" : "QR CODE PARA RESPONDER"}
      </span>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(url)}`}
        alt={alt}
      />
      <span className={styles.copyHint}>
        {copied && <small>{en ? "Copied!" : "Copiado!"}</small>}
        <button
          type="button"
          onClick={copyLink}
          title={en ? "Copy link" : "Copiar link"}
        >
          <code>{url}</code>
        </button>
      </span>
      <div className={styles.panelLink}>
        <b>{en ? "Link to the response panel:" : "Link para o painel de respostas:"}</b>
        <a href={panelUrl}>{panelUrl}</a>
      </div>
    </aside>
  );
}

// Small looping border-spinner used inside buttons while a request is in flight.
function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

// Fixed, self-dismissing message used for one-off feedback (answering a quiz
// question) so it doesn't push the surrounding layout around and disappears
// on its own instead of sticking to the screen. `messageKey` should change
// on every new message (even repeats) so the entrance animation replays.
function Toast({
  text,
  tone,
  messageKey,
  onDone,
}: {
  text: string;
  tone: "success" | "error";
  messageKey: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3800);
    return () => clearTimeout(timer);
  }, [messageKey, onDone]);
  return (
    <div
      key={messageKey}
      className={`${styles.toast} ${styles[tone]}`}
      role="status"
    >
      {text}
    </div>
  );
}

function BubbleCloud({ answers }: { answers: Word[] }) {
  const ranked = [...answers].sort((a, b) => b.count - a.count);
  const total = ranked.reduce((sum, answer) => sum + answer.count, 0) || 1;
  const max = Math.max(...ranked.map((answer) => answer.count), 1);
  const min = Math.min(...ranked.map((answer) => answer.count), max);
  // A response's visual weight should be comparable within the current class,
  // rather than shrink merely because the class has submitted few responses.
  const fontFloor = total <= 10 ? 34 : total <= 25 ? 30 : 26;
  const colorForIntensity = (intensity: number) => {
    if (intensity >= 0.86) return "#dc3e32"; // red
    if (intensity >= 0.55) return "#f28c28"; // orange
    if (intensity >= 0.35) return "#d7a42a"; // gold
    if (intensity >= 0.12) return "#4ea5d8"; // light blue
    return "#1e4d8f"; // dark blue
  };
  return (
    <div className={styles.cloud}>
      {ranked.map((answer, index) => {
        const intensity = max === min ? 0 : (answer.count - min) / (max - min);
        // A gentle curve spreads small-but-meaningful differences (for
        // example 1, 2 and 3 votes) across the full palette instead of
        // leaving nearly every answer blue when one response dominates.
        const colorIntensity = Math.pow(intensity, 0.35);
        const share = answer.count / total;
        const fontSize = Math.round(
          fontFloor + (78 - fontFloor) * Math.pow(share, 0.55),
        );
        const percentage = Math.round(share * 100);
        const angle = index * 2.399963;
        const radius =
          ranked.length === 1
            ? 0
            : 7 + Math.sqrt(index / (ranked.length - 1)) * 42;
        return (
          <div
            className={styles.bubble}
            key={answer.text}
            style={{
              fontSize: `${fontSize}px`,
              color: colorForIntensity(colorIntensity),
              left: `${50 + Math.cos(angle) * radius}%`,
              top: `${50 + Math.sin(angle) * radius * 0.78}%`,
              zIndex: Math.round(10 + intensity * 10),
            }}
          >
            <b>{answer.text}</b>
            <small>
              {answer.count} · {percentage}%
            </small>
          </div>
        );
      })}
      <div className={styles.cloudLegend} aria-label="Escala de frequência">
        <span>Mais frequente</span>
        <i className={styles.legendRed} />
        <i className={styles.legendOrange} />
        <i className={styles.legendGold} />
        <i className={styles.legendLightBlue} />
        <i className={styles.legendDarkBlue} />
        <span>Menos frequente</span>
      </div>
    </div>
  );
}

function OpenResponses({ answers }: { answers: Word[] }) {
  return (
    <div className={styles.openResults}>
      {answers.map((answer) => (
        <div key={answer.text}>
          <b>{answer.text}</b>
          <small>
            {answer.count} {answer.count === 1 ? "resposta" : "respostas"}
          </small>
        </div>
      ))}
    </div>
  );
}

function ChallengeDistribution({
  distribution,
  onAnswerKeyChange,
  en,
}: {
  distribution: ChallengeResults["distribution"];
  onAnswerKeyChange: (questionId: number, correctAnswer: number) => void;
  en: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 22, marginTop: 14 }}>
      {distribution.map(({ question, counts, total }, questionIndex) => (
        <section
          key={question.id}
          style={{
            padding: 18,
            border: "1px solid #e1d8c9",
            borderRadius: 12,
            background: "#fffefa",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 14,
            }}
          >
            <div>
              <span
                className={styles.kicker}
              >{`QUIZ ${questionIndex + 1}`}</span>
              <h2 style={{ margin: "6px 0 0", color: "#123765", fontSize: 19 }}>
                {question.title}
              </h2>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#526278",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}
              >
                {question.stem}
              </p>
            </div>
            <label
              style={{
                display: "grid",
                gap: 5,
                color: "#8c6c26",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {en ? "Answer key" : "Gabarito"}
              <select
                value={question.correctAnswer}
                onChange={(event) =>
                  onAnswerKeyChange(question.id, Number(event.target.value))
                }
                style={{
                  border: "1px solid #d7b349",
                  borderRadius: 8,
                  padding: "7px 10px",
                  color: "#123765",
                  fontWeight: 800,
                  background: "#fffaf0",
                }}
              >
                {question.options.map((_, index) => (
                  <option key={index} value={index}>
                    {letters[index].toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {question.options.map((option, index) => {
            const count = counts[index] ?? 0;
            const percentage = total ? Math.round((count / total) * 100) : 0;
            return (
              <div className={styles.bar} key={option}>
                <div>
                  <b>
                    {letters[index]}) {option}
                  </b>
                  <span>
                    {count} · {percentage}%
                  </span>
                </div>
                <i>
                  <em
                    className={
                      index === question.correctAnswer ? styles.correct : ""
                    }
                    style={{ width: `${percentage}%` }}
                  />
                </i>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<
    | "home"
    | "new"
    | "vote"
    | "panel"
    | "challenge-new"
    | "challenge"
    | "challenge-panel"
  >("new");
  const [language, setLanguage] = useState<Language>("pt");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [challengeList, setChallengeList] = useState<
    { id: number; title: string; createdAt: string }[]
  >([]);
  const [challengeListLoaded, setChallengeListLoaded] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTick, setMessageTick] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [draggingImage, setDraggingImage] = useState(false);
  const [showImageUrlField, setShowImageUrlField] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeResults, setChallengeResults] =
    useState<ChallengeResults | null>(null);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeQuestionIds, setChallengeQuestionIds] = useState<number[]>(
    [],
  );
  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(
    null,
  );
  const [challengeAlias, setChallengeAlias] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeStep, setChallengeStep] = useState(0);
  const [challengeSelected, setChallengeSelected] = useState<number | null>(
    null,
  );
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState("");
  const [challengeMessageTick, setChallengeMessageTick] = useState(0);
  const [challengeMessageTone, setChallengeMessageTone] = useState<
    "success" | "error"
  >("success");
  const [form, setForm] = useState({
    title: "",
    stem: "",
    imageUrl: "",
    kind: "choice" as "choice" | "cloud" | "open",
    options: ["", "", "", ""],
    correctAnswer: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const query = useMemo(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(location.search)
        : null,
    [],
  );
  const id = query?.get("q");
  const trophyId = query?.get("trofeu");
  const panel = query?.get("painel") === "1";
  const historyView = query?.get("historico") === "1";
  const en = language === "en";

  const load = useCallback(async () => {
    const response = await fetch("/api/questions");
    if (response.ok) setQuestions((await response.json()).questions);
    setQuestionsLoaded(true);
  }, []);
  const loadChallengeList = useCallback(async () => {
    const response = await fetch("/api/challenges");
    if (response.ok) setChallengeList((await response.json()).challenges);
    setChallengeListLoaded(true);
  }, []);
  function goToHistory() {
    location.href = "?historico=1";
  }
  function goBack() {
    // Every non-home screen returns to the actual immediately preceding page.
    // A direct URL has no in-app predecessor, so fall back to the home page.
    if (window.history.length > 1) window.history.back();
    else location.href = "?";
  }
  async function downloadSlideImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f8f4eb"; context.fillRect(0, 0, 1600, 900);
    context.fillStyle = "#0d3565"; context.fillRect(0, 0, 1600, 120);
    context.fillStyle = "#fff8e8"; context.font = "700 34px Arial"; context.fillText("DermPath QMaker", 72, 73);
    context.fillStyle = "#152d52"; context.font = "600 62px Georgia";
    const words = form.title.trim().split(/\s+/); let line = "", y = 230;
    for (const word of words) { const next = `${line} ${word}`.trim(); if (context.measureText(next).width > 1380) { context.fillText(line, 92, y); y += 72; line = word; } else line = next; }
    context.fillText(line, 92, y); y += 72;
    context.font = "32px Arial"; context.fillStyle = "#526278"; context.fillText(form.stem || (en ? "Question" : "Pergunta"), 92, y);
    if (form.imageUrl) {
      const image = new Image(); image.crossOrigin = "anonymous"; image.src = form.imageUrl;
      await new Promise((resolve) => { image.onload = image.onerror = resolve; });
      if (image.naturalWidth) { const scale = Math.min(900 / image.naturalWidth, 430 / image.naturalHeight); context.drawImage(image, 92, y + 55, image.naturalWidth * scale, image.naturalHeight * scale); }
    }
    const link = document.createElement("a"); link.download = "quiz-16x9.png"; link.href = canvas.toDataURL("image/png"); link.click();
  }
  const loadQuestion = useCallback(async (questionId: string) => {
    const response = await fetch(`/api/questions/${questionId}`);
    if (response.ok) setQuestion((await response.json()).question);
  }, []);
  const loadResults = useCallback(async (questionId: string) => {
    const response = await fetch(`/api/questions/${questionId}/results`);
    if (response.ok) {
      const data = await response.json();
      setResults(data);
      setQuestion(data.question);
    }
  }, []);
  const loadChallenge = useCallback(async (challengeId: string) => {
    const response = await fetch(`/api/challenges/${challengeId}`);
    if (response.ok) setChallenge((await response.json()).challenge);
  }, []);
  const loadChallengeResults = useCallback(async (challengeId: string) => {
    const response = await fetch(`/api/challenges/${challengeId}/results`);
    if (response.ok) setChallengeResults(await response.json());
  }, []);
  useEffect(() => {
    if (trophyId) {
      setMode(panel ? "challenge-panel" : "challenge");
      loadChallenge(trophyId);
      if (panel) loadChallengeResults(trophyId);
    } else if (id) {
      setMode(panel ? "panel" : "vote");
      panel ? loadResults(id) : loadQuestion(id);
    } else {
      if (historyView) setMode("home");
      load();
      loadChallengeList();
    }
  }, [
    id,
    trophyId,
    panel,
    historyView,
    load,
    loadQuestion,
    loadResults,
    loadChallenge,
    loadChallengeResults,
    loadChallengeList,
  ]);
  useEffect(() => {
    if (!panel || !id) return;
    const timer = setInterval(() => loadResults(id), 5000);
    return () => clearInterval(timer);
  }, [id, panel, loadResults]);
  useEffect(() => {
    if (!panel || !trophyId) return;
    const timer = setInterval(() => loadChallengeResults(trophyId), 5000);
    return () => clearInterval(timer);
  }, [trophyId, panel, loadChallengeResults]);

  const emptyForm = {
    title: "",
    stem: "",
    imageUrl: "",
    kind: "choice" as "choice" | "cloud" | "open",
    options: ["", "", "", ""],
    correctAnswer: 0,
  };
  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setMode("new");
  }
  async function startEdit(questionId: number) {
    const response = await fetch(`/api/questions/${questionId}`);
    const data = await response.json();
    if (!response.ok)
      return alert(
        data.error ??
          (en
            ? "Could not load the quiz."
            : "Não foi possível carregar o quiz."),
      );
    const loaded = data.question as Question;
    setForm({
      title: loaded.title,
      stem: loaded.stem,
      imageUrl: loaded.imageUrl ?? "",
      kind: loaded.kind,
      options:
        loaded.kind === "choice"
          ? [...loaded.options, "", "", "", ""].slice(
              0,
              Math.max(4, loaded.options.length),
            )
          : ["", "", "", ""],
      correctAnswer: loaded.correctAnswer,
    });
    setEditingId(questionId);
    setMessage("");
    setMode("new");
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      const response = await teacherFetch(
        `/api/questions/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        en,
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        return setMessage(
          data?.error ??
            (en
              ? "Could not save the changes."
              : "Não foi possível salvar as alterações."),
        );
      location.href = `?q=${editingId}&painel=1`;
      return;
    }
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    location.href = `?q=${data.question.id}&painel=1`;
  }
  async function vote() {
    if (
      !id ||
      voting ||
      (question?.kind === "choice" && selected === null) ||
      (question?.kind !== "choice" && !openAnswer.trim())
    )
      return;
    setVoting(true);
    const response = await fetch(`/api/questions/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerIndex: selected, answerText: openAnswer }),
    });
    const data = await response.json();
    setVoting(false);
    setVoted(response.ok);
    setMessage(
      response.ok
        ? en
          ? "Answer recorded! Wait for the class discussion."
          : "Resposta registrada! Aguarde a discussão da turma."
        : data.error,
    );
    setMessageTick((tick) => tick + 1);
  }
  async function reset() {
    if (
      id &&
      confirm(
        en
          ? "Reset all answers for this quiz?"
          : "Zerar todas as respostas desta questão?",
      )
    ) {
      await teacherFetch(
        `/api/questions/${id}/results`,
        { method: "DELETE" },
        en,
      );
      loadResults(id);
    }
  }
  function startCreateChallenge() {
    load();
    setChallengeTitle("");
    setChallengeQuestionIds([]);
    setEditingChallengeId(null);
    setChallengeMessage("");
    setMode("challenge-new");
  }
  async function startEditChallenge(challengeId: number) {
    load();
    const response = await fetch(`/api/challenges/${challengeId}`);
    const data = await response.json();
    if (!response.ok)
      return alert(
        data.error ??
          (en
            ? "Could not load the challenge."
            : "Não foi possível carregar o desafio."),
      );
    setChallengeTitle(data.challenge.title);
    setChallengeQuestionIds(
      data.challenge.questions.map(
        (question: ChallengeQuestion) => question.id,
      ),
    );
    setEditingChallengeId(challengeId);
    setChallengeMessage("");
    setMode("challenge-new");
  }
  async function deleteChallenge(challengeId: number, title: string) {
    if (
      !confirm(
        en
          ? `Delete "${title}"? This removes its players and scores too.`
          : `Excluir "${title}"? Isso também remove os jogadores e pontuações dele.`,
      )
    )
      return;
    const response = await teacherFetch(
      `/api/challenges/${challengeId}`,
      { method: "DELETE" },
      en,
    );
    if (response.ok) {
      setChallengeList((current) =>
        current.filter((item) => item.id !== challengeId),
      );
      return;
    }
    const data = await response.json().catch(() => null);
    alert(
      data?.error ??
        (en
          ? "Could not delete the challenge."
          : "Não foi possível excluir o desafio."),
    );
  }
  async function createChallenge(event: FormEvent) {
    event.preventDefault();
    if (editingChallengeId) {
      const response = await teacherFetch(
        `/api/challenges/${editingChallengeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: challengeTitle,
            questionIds: challengeQuestionIds,
          }),
        },
        en,
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        return setChallengeMessage(
          data?.error ??
            (en
              ? "Could not save the changes."
              : "Não foi possível salvar as alterações."),
        );
      location.href = `?trofeu=${editingChallengeId}&painel=1`;
      return;
    }
    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: challengeTitle,
        questionIds: challengeQuestionIds,
      }),
    });
    const data = await response.json();
    if (!response.ok) return setChallengeMessage(data.error);
    location.href = `?trofeu=${data.challenge.id}&painel=1`;
  }
  async function joinChallenge() {
    if (!trophyId) return;
    const savedToken = localStorage.getItem(`qmaker-trophy-${trophyId}`);
    let response = await fetch(`/api/challenges/${trophyId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        savedToken ? { token: savedToken } : { alias: challengeAlias },
      ),
    });
    if (!response.ok && savedToken) {
      localStorage.removeItem(`qmaker-trophy-${trophyId}`);
      response = await fetch(`/api/challenges/${trophyId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: challengeAlias }),
      });
    }
    const data = await response.json();
    if (!response.ok) return setChallengeMessage(data.error);
    localStorage.setItem(`qmaker-trophy-${trophyId}`, data.participant.token);
    setChallengeToken(data.participant.token);
    setChallengeMessage("");
  }
  async function answerChallenge(answerIndex: number) {
    if (!trophyId || !challenge || !challengeToken || challengeAnswered) return;
    const current = challenge.questions[challengeStep];
    const response = await fetch(`/api/challenges/${trophyId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: challengeToken,
        questionId: current.id,
        answerIndex,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setChallengeMessageTone("error");
      setChallengeMessage(data.error);
      setChallengeMessageTick((tick) => tick + 1);
      return;
    }
    setChallengeSelected(answerIndex);
    setChallengeAnswered(true);
    setChallengeMessageTone("success");
    setChallengeMessage(
      data.isCorrect
        ? en
          ? "Correct!"
          : "Acertou!"
        : en
          ? "Answer recorded."
          : "Resposta registrada.",
    );
    setChallengeMessageTick((tick) => tick + 1);
  }
  function nextChallengeQuestion() {
    if (!challengeAnswered) return;
    setChallengeStep((step) => step + 1);
    setChallengeSelected(null);
    setChallengeAnswered(false);
    setChallengeMessage("");
  }
  async function resetChallenge() {
    if (
      !trophyId ||
      !confirm(
        en
          ? "Reset this challenge? This removes all players and scores."
          : "Reiniciar este desafio? Isso removerá todos os jogadores e pontuações.",
      )
    )
      return;
    const response = await teacherFetch(
      `/api/challenges/${trophyId}/results`,
      { method: "DELETE" },
      en,
    );
    if (response.ok) {
      setChallengeResults((current) =>
        current ? { ...current, ranking: [] } : current,
      );
    } else {
      const data = await response.json().catch(() => null);
      setChallengeMessage(
        data?.error ??
          (en
            ? "Could not reset the challenge."
            : "Não foi possível reiniciar o desafio."),
      );
    }
  }
  async function updateAnswerKey(questionId: number, correctAnswer: number) {
    const response = await teacherFetch(
      `/api/questions/${questionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctAnswer }),
      },
      en,
    );
    const data = await response.json();
    if (!response.ok)
      return setChallengeMessage(
        data.error ??
          (en
            ? "Could not update the answer key."
            : "Não foi possível atualizar o gabarito."),
      );
    if (trophyId)
      await Promise.all([
        loadChallenge(trophyId),
        loadChallengeResults(trophyId),
      ]);
  }
  async function uploadImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return setUploadError(
        en ? "Choose an image file." : "Escolha um arquivo de imagem.",
      );
    if (file.size > 8 * 1024 * 1024)
      return setUploadError(
        en
          ? "The image must be up to 8 MB."
          : "A imagem deve ter no máximo 8 MB.",
      );
    setUploading(true);
    setUploadError("");
    const data = new FormData();
    data.append("file", file);
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: data,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload)
        throw new Error(
          payload?.error ??
            (en
              ? "Could not upload the image."
              : "Não foi possível enviar a imagem."),
        );
      setForm((current) => ({ ...current, imageUrl: payload.url }));
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : en
            ? "Could not upload the image."
            : "Não foi possível enviar a imagem.",
      );
    } finally {
      setUploading(false);
    }
  }
  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    uploadImage(event.target.files?.[0]);
    event.target.value = "";
  }
  function dropImage(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingImage(false);
    uploadImage(event.dataTransfer.files?.[0]);
  }
  const goHome = goBack;
  async function deleteQuestion(questionId: number, title: string) {
    if (
      !confirm(
        en
          ? `Delete "${title}"? This also removes its votes and its slot in any trophy challenge.`
          : `Excluir "${title}"? Isso também remove os votos e a participação em qualquer desafio troféu.`,
      )
    )
      return;
    const response = await teacherFetch(
      `/api/questions/${questionId}`,
      { method: "DELETE" },
      en,
    );
    if (response.ok) {
      setQuestions((current) =>
        current.filter((item) => item.id !== questionId),
      );
      return;
    }
    const data = await response.json().catch(() => null);
    alert(
      data?.error ??
        (en
          ? "Could not delete the quiz."
          : "Não foi possível excluir o quiz."),
    );
  }

  if (mode === "challenge" && challenge && challengeToken) {
    const current = challenge.questions[challengeStep];
    if (!current)
      return (
        <main className={styles.shell}>
          <AppHeader
            language={language}
            setLanguage={setLanguage}
            onBack={goHome}
          />
          <section className={styles.card}>
            <header>
              <span className={styles.kicker}>
                {en ? "TROPHY CHALLENGE" : "DESAFIO TROFÉU"}
              </span>
            </header>
            <article className={styles.question}>
              <h1>{en ? "Challenge complete!" : "Desafio concluído!"}</h1>
              <p>
                {en
                  ? "Your answers have been recorded. Check the projected screen for the final trophy."
                  : "Suas respostas foram registradas. Confira a tela projetada para ver o troféu final."}
              </p>
            </article>
          </section>
          {challengeMessage && (
            <Toast
              text={challengeMessage}
              tone={challengeMessageTone}
              messageKey={challengeMessageTick}
              onDone={() => setChallengeMessage("")}
            />
          )}
        </main>
      );
    const isLastQuestion = challengeStep === challenge.questions.length - 1;
    return (
      <main className={styles.shell}>
        <AppHeader
          language={language}
          setLanguage={setLanguage}
          onBack={goHome}
        />
        <section className={styles.card}>
          <header style={{ display: "block" }}>
            <span className={styles.kicker}>
              {en
                ? `TROPHY CHALLENGE · QUIZ ${challengeStep + 1}/${challenge.questions.length}`
                : `DESAFIO TROFÉU · QUIZ ${challengeStep + 1}/${challenge.questions.length}`}
            </span>
            <span className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{
                  width: `${((challengeStep + (challengeAnswered ? 1 : 0)) / challenge.questions.length) * 100}%`,
                }}
              />
            </span>
          </header>
          <article className={styles.question}>
            <h1>{current.title}</h1>
            <p>{current.stem}</p>
            {current.imageUrl && (
              <img
                className={styles.micrograph}
                src={current.imageUrl}
                alt="Imagem da questão"
              />
            )}
            <div className={styles.choices}>
              {current.options.map((option, index) => (
                <button
                  disabled={challengeAnswered}
                  className={
                    challengeSelected === index ? styles.choiceMarked : ""
                  }
                  onClick={() => answerChallenge(index)}
                  key={option}
                >
                  <b>{letters[index]}</b>
                  {option}
                </button>
              ))}
            </div>
            <button
              className={`${styles.primary} ${styles.nextQuestion}`}
              disabled={!challengeAnswered}
              onClick={nextChallengeQuestion}
            >
              {isLastQuestion
                ? en
                  ? "Finish challenge"
                  : "Concluir desafio"
                : en
                  ? "Next question"
                  : "Próxima questão"}
            </button>
          </article>
        </section>
        {challengeMessage && (
          <Toast
            text={challengeMessage}
            tone={challengeMessageTone}
            messageKey={challengeMessageTick}
            onDone={() => setChallengeMessage("")}
          />
        )}
      </main>
    );
  }

  if (mode === "challenge-new")
    return (
      <main className={styles.shell}>
        <AppHeader
          language={language}
          setLanguage={setLanguage}
          onBack={() => setMode("new")}
        />
        <section className={styles.card}>
          <header>
            <span className={styles.kicker}>
              {editingChallengeId
                ? en
                  ? "EDIT TROPHY CHALLENGE"
                  : "EDITAR DESAFIO TROFÉU"
                : en
                  ? "TROPHY CHALLENGE"
                  : "DESAFIO TROFÉU"}
            </span>
          </header>
          <form className={styles.form} onSubmit={createChallenge}>
            <label>
              {en ? "Challenge title" : "Título do desafio"}
              <input
                required
                value={challengeTitle}
                placeholder={
                  en
                    ? "Example: Melanoma review"
                    : "Exemplo: Revisão de melanoma"
                }
                onChange={(event) => setChallengeTitle(event.target.value)}
              />
            </label>
            <fieldset>
              <legend>
                {en ? "Multiple-choice quizzes" : "Quizzes de múltipla escolha"}
              </legend>
              <p className={styles.helper}>
                {en
                  ? "Select at least two existing quizzes. We recommend three for a 3/3 trophy."
                  : "Selecione ao menos dois quizzes existentes. Recomendamos três para o troféu 3/3."}
              </p>
              <div className={styles.openResults}>
                {questions
                  .filter((item) => item.kind === "choice")
                  .map((item) => (
                    <label
                      key={item.id}
                      style={{
                        gridTemplateColumns: "auto 1fr",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={challengeQuestionIds.includes(item.id)}
                        onChange={() =>
                          setChallengeQuestionIds((current) =>
                            current.includes(item.id)
                              ? current.filter(
                                  (questionId) => questionId !== item.id,
                                )
                              : [...current, item.id],
                          )
                        }
                      />
                      <span>
                        <b>{item.title}</b>
                        <small>
                          {en ? `Quiz ${item.id}` : `Questão ${item.id}`}
                        </small>
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>
            <button className={styles.primary}>
              {editingChallengeId
                ? en
                  ? "Save changes"
                  : "Salvar alterações"
                : en
                  ? "Create challenge and QR Code"
                  : "Criar desafio e QR Code"}
            </button>
            {challengeMessage && (
              <p className={styles.error}>{challengeMessage}</p>
            )}
          </form>
        </section>
      </main>
    );

  if (mode === "challenge-panel" && challenge && challengeResults) {
    const joinUrl = `${location.origin}?trofeu=${challenge.id}`;
    const panelUrl = `${location.origin}?trofeu=${challenge.id}&painel=1`;
    const perfectWinners = challengeResults.ranking.filter(
      (entry) =>
        challengeResults.totalQuestions > 0 &&
        entry.correct === challengeResults.totalQuestions,
    );
    const highestScore = Math.max(
      ...challengeResults.ranking.map((entry) => entry.correct),
      0,
    );
    const trophyWinners = perfectWinners.length
      ? perfectWinners
      : challengeResults.ranking.filter(
          (entry) => entry.correct === highestScore,
        );
    const hasPerfectScore = perfectWinners.length > 0;
    return (
      <main className={styles.shell}>
        <AppHeader
          language={language}
          setLanguage={setLanguage}
          onBack={goHome}
        />
        <section className={styles.dashboard}>
          <header>
            <div>
              <span className={styles.kicker}>
                {en
                  ? "TROPHY CHALLENGE · TEACHER PANEL"
                  : "DESAFIO TROFÉU · PAINEL DO PROFESSOR"}
              </span>
              <h1>{challenge.title}</h1>
              <p>
                {en
                  ? `${challenge.questions.length} quizzes · live score`
                  : `${challenge.questions.length} quizzes · pontuação ao vivo`}
              </p>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.back}
                onClick={() => setShowQr(!showQr)}
              >
                {showQr
                  ? en
                    ? "Hide QR"
                    : "Ocultar QR"
                  : en
                    ? "Show QR"
                    : "Mostrar QR"}
              </button>
              <button className={styles.danger} onClick={resetChallenge}>
                {en ? "Reset challenge" : "Reiniciar desafio"}
              </button>
              <b key={challengeResults.ranking.length} className={styles.total}>
                {challengeResults.ranking.length}
                <small>{en ? "players" : "jogadores"}</small>
              </b>
            </div>
          </header>
          <div className={styles.grid}>
            {showQr && (
              <QrPanel url={joinUrl} panelUrl={panelUrl} alt="QR Code do desafio" en={en} />
            )}
            <article className={styles.results}>
              <span className={styles.kicker}>{en ? "TROPHY" : "TROFÉU"}</span>
              {trophyWinners.length ? (
                <div
                  key={`${hasPerfectScore}-${trophyWinners.length}`}
                  className={styles.openResults}
                >
                  {trophyWinners.map((winner, index) => (
                    <div key={`${winner.alias}-${index}`}>
                      <b>
                        <span className={styles.confettiBurst}>
                          🏆
                          {[
                            "#d9ad43",
                            "#9172d3",
                            "#4f9ee3",
                            "#df4c93",
                            "#34b980",
                          ].map((color, index) => (
                            <i
                              key={index}
                              style={
                                {
                                  "--c": color,
                                  animationDelay: `${index * 0.05}s`,
                                  transform: `translate(-50%,-50%) rotate(${index * 72}deg)`,
                                } as CSSProperties
                              }
                            />
                          ))}
                        </span>{" "}
                        {winner.alias}
                      </b>
                      <small>
                        {winner.correct}/{challengeResults.totalQuestions}{" "}
                        {hasPerfectScore
                          ? en
                            ? "correct answers · perfect score"
                            : "acertos · pontuação perfeita"
                          : en
                            ? "correct answers · highest score"
                            : "acertos · maior pontuação"}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.helper}>
                  {en
                    ? "The trophy will appear here when participants start answering."
                    : "O troféu aparecerá aqui quando os participantes começarem a responder."}
                </p>
              )}
              <span
                className={styles.kicker}
                style={{ display: "block", marginTop: 28 }}
              >
                {en ? "ANSWERS BY QUIZ" : "RESPOSTAS POR QUIZ"}
              </span>
              <ChallengeDistribution
                distribution={challengeResults.distribution}
                onAnswerKeyChange={updateAnswerKey}
                en={en}
              />
            </article>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "challenge" && challenge && !challengeToken)
    return (
      <main className={styles.shell}>
        <AppHeader
          language={language}
          setLanguage={setLanguage}
          onBack={goHome}
        />
        <section className={styles.card}>
          <header>
            <span className={styles.kicker}>
              {en ? "TROPHY CHALLENGE" : "DESAFIO TROFÉU"}
            </span>
          </header>
          <article className={styles.question}>
            <h1>{challenge.title}</h1>
            <p>
              {en
                ? "Enter your name to count your correct answers. It will only be shown in the final trophy."
                : "Digite seu nome para contabilizar seus acertos. Ele será exibido apenas no troféu final."}
            </p>
            <label className={styles.nameEntry}>
              <span>{en ? "Enter your name" : "Digite seu nome"}</span>
              <input
                autoFocus
                value={challengeAlias}
                maxLength={40}
                placeholder={en ? "Example: Ana Silva" : "Exemplo: Ana Silva"}
                onChange={(event) => setChallengeAlias(event.target.value)}
              />
            </label>
            <button
              className={styles.primary}
              style={{ marginTop: 20 }}
              onClick={joinChallenge}
            >
              {en ? "Join challenge" : "Entrar no desafio"}
            </button>
            {challengeMessage && (
              <p className={styles.error}>{challengeMessage}</p>
            )}
          </article>
        </section>
      </main>
    );

  if (mode === "new")
    return (
      <main className={styles.shell}>
        <AppHeader
          home
          language={language}
          setLanguage={setLanguage}
          onHistory={goToHistory}
        />
        <section className={styles.card}>
          <header>
            <div>
              <span className={styles.kicker}>
                {editingId
                  ? en
                    ? "EDIT QUIZ"
                    : "EDITAR QUIZ"
                  : en
                    ? "CREATE QUIZ"
                    : "CRIAR QUIZ"}
              </span>
              <h1>
                {editingId
                  ? en
                    ? "Edit quiz"
                    : "Editar quiz"
                  : en
                    ? "Create a new quiz"
                    : "Criar um novo quiz"}
              </h1>
            </div>
          </header>
          <form className={styles.form} onSubmit={create}>
            <fieldset
              className={styles.formatOptions}
              style={
                editingId ? { opacity: 0.6, pointerEvents: "none" } : undefined
              }
            >
              <legend>
                {en ? "Format" : "Formato"}
                {editingId &&
                  ` (${en ? "can't be changed when editing" : "não pode ser alterado ao editar"})`}
              </legend>
              <div>
                {(
                  [
                    {
                      kind: "choice",
                      title: en ? "Multiple choice" : "Múltipla escolha",
                      text: en
                        ? "Predefined options with a correct answer."
                        : "Alternativas com resposta correta.",
                    },
                    {
                      kind: "cloud",
                      title: en ? "Word cloud" : "Nuvem de palavras",
                      text: en
                        ? "Repeated answers become larger in the cloud."
                        : "Respostas repetidas ganham destaque na nuvem.",
                    },
                    {
                      kind: "open",
                      title: en ? "Open response" : "Resposta aberta",
                      text: en
                        ? "Longer answers displayed as a list."
                        : "Respostas mais longas exibidas em lista.",
                    },
                  ] as const
                ).map((format) => (
                  <button
                    type="button"
                    className={
                      form.kind === format.kind ? styles.formatActive : ""
                    }
                    key={format.kind}
                    onClick={() => setForm({ ...form, kind: format.kind })}
                  >
                    <FormatIcon kind={format.kind} />
                    <b>{format.title}</b>
                    <small>{format.text}</small>
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.trophyFormat}
                  onClick={startCreateChallenge}
                >
                  <FormatIcon kind="trophy" />
                  <b>{en ? "Trophy challenge" : "Desafio Troféu"}</b>
                  <small>
                    {en
                      ? "A scored sequence of multiple-choice questions."
                      : "Sequência pontuada de questões de múltipla escolha."}
                  </small>
                </button>
              </div>
            </fieldset>
            <label>
              {en ? "Short title" : "Título curto"}
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              {en ? "Question stem" : "Enunciado"}
              <textarea
                required
                value={form.stem}
                onChange={(event) =>
                  setForm({ ...form, stem: event.target.value })
                }
              />
            </label>
            <fieldset>
              <legend>{en ? "Image (optional)" : "Imagem (opcional)"}</legend>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDraggingImage(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDraggingImage(false)}
                onDrop={dropImage}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: 14,
                  border: `1px dashed ${draggingImage ? "#9677d9" : "#cdbf9d"}`,
                  borderRadius: 10,
                  background: draggingImage ? "#f7f3ff" : "#fbf7ed",
                }}
              >
                <span
                  style={{ color: "#526278", fontSize: 13, fontWeight: 400 }}
                >
                  {uploading
                    ? en
                      ? "Uploading image…"
                      : "Enviando imagem…"
                    : en
                      ? "Drag an image here or attach a file."
                      : "Arraste uma imagem aqui ou anexe um arquivo."}
                </span>
                <button
                  type="button"
                  className={styles.back}
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {en ? "Attach image" : "Anexar imagem"}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={chooseImage}
                />
              </div>
              {uploadError && <p className={styles.error}>{uploadError}</p>}
              {showImageUrlField || form.imageUrl ? (
                <label style={{ marginTop: 12 }}>
                  {en ? "Image URL (optional)" : "URL da imagem (opcional)"}
                  <input
                    value={form.imageUrl}
                    placeholder={
                      en
                        ? "Paste an image URL, if preferred"
                        : "Cole a URL de uma imagem, se preferir"
                    }
                    onChange={(event) =>
                      setForm({ ...form, imageUrl: event.target.value })
                    }
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setShowImageUrlField(true)}
                  style={{ marginTop: 12 }}
                >
                  {en
                    ? "or paste an image URL instead"
                    : "ou cole uma URL de imagem"}
                </button>
              )}
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt={
                    en
                      ? "Selected image preview"
                      : "Prévia da imagem selecionada"
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 240,
                    marginTop: 10,
                    borderRadius: 10,
                    objectFit: "contain",
                    background: "#f7f1e4",
                  }}
                />
              )}
            </fieldset>
            {form.kind === "choice" && (
              <fieldset>
                <legend>
                  {en
                    ? "Options and correct answer"
                    : "Alternativas e resposta correta"}
                </legend>
                {form.options.map((option, index) => (
                  <div className={styles.optionInput} key={index}>
                    <input
                      type="radio"
                      name="correct"
                      checked={form.correctAnswer === index}
                      onChange={() =>
                        setForm({ ...form, correctAnswer: index })
                      }
                    />
                    <span>{letters[index]})</span>
                    <input
                      required
                      value={option}
                      onChange={(event) => {
                        const options = [...form.options];
                        options[index] = event.target.value;
                        setForm({ ...form, options });
                      }}
                    />
                  </div>
                ))}
              </fieldset>
            )}
            {form.kind === "cloud" && (
              <p className={styles.helper}>
                {en
                  ? "There is no word or character limit. Repeated answers become larger in the cloud."
                  : "Não há limite de palavras ou caracteres. Respostas repetidas ganham destaque na nuvem."}
              </p>
            )}
            {form.kind === "open" && (
              <p className={styles.helper}>
                {en
                  ? "Students can send a longer response. The panel groups identical answers in a readable list."
                  : "Os alunos podem enviar respostas mais longas. O painel agrupa respostas idênticas em uma lista legível."}
              </p>
            )}
            <button className={styles.primary}>
              {editingId
                ? en
                  ? "Save changes"
                  : "Salvar alterações"
                : en
                  ? "Create quiz and QR Code"
                  : "Criar quiz e QR Code"}
            </button>
            <button type="button" className={styles.exportSlide} onClick={downloadSlideImage}>
              {en ? "Download 16:9 image" : "Baixar imagem 16:9"}
            </button>
            {message && <p className={styles.error}>{message}</p>}
          </form>
        </section>
      </main>
    );

  if (mode === "panel" && results) {
    const url = `${location.origin}?q=${results.question.id}`;
    const panelUrl = `${location.origin}?q=${results.question.id}&painel=1`;
    const textKind =
      results.question.kind === "cloud"
        ? en
          ? "WORD CLOUD"
          : "NUVEM DE PALAVRAS"
        : results.question.kind === "open"
          ? en
            ? "OPEN RESPONSE"
            : "RESPOSTA ABERTA"
          : en
            ? "MULTIPLE CHOICE"
            : "MÚLTIPLA ESCOLHA";
    const resultLabel =
      results.question.kind === "cloud"
        ? en
          ? "WORD CLOUD"
          : "NUVEM DE PALAVRAS"
        : results.question.kind === "open"
          ? en
            ? "OPEN RESPONSES"
            : "RESPOSTAS ABERTAS"
          : en
            ? "DISTRIBUTION"
            : "DISTRIBUIÇÃO";
    const resultContent =
      results.question.kind === "cloud" ? (
        <BubbleCloud answers={results.answers ?? []} />
      ) : results.question.kind === "open" ? (
        <OpenResponses answers={results.answers ?? []} />
      ) : (
        results.question.options.map((option, index) => {
          const count = results.counts?.[index] ?? 0;
          const percentage = results.total
            ? Math.round((count / results.total) * 100)
            : 0;
          return (
            <div className={styles.bar} key={option}>
              <div>
                <b>
                  {letters[index]}) {option}
                </b>
                <span>
                  {count} · {percentage}%
                </span>
              </div>
              <i>
                <em
                  className={
                    index === results.question.correctAnswer
                      ? styles.correct
                      : ""
                  }
                  style={{ width: `${percentage}%` }}
                />
              </i>
            </div>
          );
        })
      );
    return (
      <main className={styles.shell}>
        <AppHeader
          language={language}
          setLanguage={setLanguage}
          onBack={goHome}
        />
        <section className={styles.dashboard}>
          <header>
            <div>
              <span className={styles.kicker}>
                {en ? "TEACHER PANEL" : "PAINEL DO PROFESSOR"} · {textKind}
              </span>
              <h1>{results.question.title}</h1>
              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 780,
                  color: "#41536c",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}
              >
                {results.question.stem}
              </p>
              <p>
                {en
                  ? "Updates automatically every 5 seconds."
                  : "Atualiza automaticamente a cada 5 segundos."}
              </p>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.back}
                onClick={() => setShowQr(!showQr)}
              >
                {showQr
                  ? en
                    ? "Hide QR"
                    : "Ocultar QR"
                  : en
                    ? "Show QR"
                    : "Mostrar QR"}
              </button>
              <button
                className={styles.back}
                onClick={() => setShowAnswers(!showAnswers)}
              >
                {showAnswers
                  ? en
                    ? "Hide results"
                    : "Ocultar respostas"
                  : en
                    ? "Reveal results"
                    : "Revelar respostas"}
              </button>
              <button className={styles.danger} onClick={reset}>
                {en ? "Reset votes" : "Zerar votação"}
              </button>
              <b key={results.total} className={styles.total}>
                {results.total}
                <small>{en ? "answers" : "respostas"}</small>
              </b>
            </div>
          </header>
          <div className={styles.grid}>
            {showQr && <QrPanel url={url} panelUrl={panelUrl} alt="QR Code" en={en} />}
            <article className={styles.results}>
              <span className={styles.kicker}>{resultLabel}</span>
              <div
                key={showAnswers ? "shown" : "hidden"}
                className={styles.revealFade}
              >
                {showAnswers ? (
                  resultContent
                ) : (
                  <div className={styles.resultsHidden}>
                    {en
                      ? "Responses are hidden until you reveal them."
                      : "As respostas estão ocultas até você revelá-las."}
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "vote" && question)
    return (
      <main className={styles.shell}>
        <AppHeader
          language={language}
          setLanguage={setLanguage}
          onBack={goHome}
        />
        <section className={styles.card}>
          <header>
            <span className={styles.kicker}>DERMPATH QMAKER</span>
            <span>Dermatopatologia</span>
          </header>
          <article className={styles.question}>
            <h1>{question.title}</h1>
            <p>{question.stem}</p>
            {question.imageUrl && (
              <img
                className={styles.micrograph}
                src={question.imageUrl}
                alt="Imagem da questão"
              />
            )}
            {question.kind !== "choice" ? (
              <>
                <textarea
                  className={styles.openAnswer}
                  maxLength={question.kind === "open" ? 180 : undefined}
                  disabled={voted}
                  value={openAnswer}
                  onChange={(event) => setOpenAnswer(event.target.value)}
                  placeholder={
                    question.kind === "cloud"
                      ? en
                        ? "Write your answer…"
                        : "Escreva sua resposta…"
                      : en
                        ? "Write a longer response…"
                        : "Escreva uma resposta mais longa…"
                  }
                />
              </>
            ) : (
              <div className={styles.choices}>
                {question.options.map((option, index) => (
                  <button
                    disabled={voted}
                    className={selected === index ? styles.selected : ""}
                    onClick={() => {
                      setSelected(index);
                      setMessage("");
                    }}
                    key={option}
                  >
                    <b>{letters[index]}</b>
                    {option}
                  </button>
                ))}
              </div>
            )}
            <button
              className={styles.primary}
              onClick={vote}
              disabled={voting || voted}
            >
              {voting && <Spinner />}
              {en ? "Submit answer" : "Confirmar resposta"}
            </button>
          </article>
        </section>
        {message && (
          <Toast
            text={message}
            tone={voted ? "success" : "error"}
            messageKey={messageTick}
            onDone={() => setMessage("")}
          />
        )}
      </main>
    );

  if (
    mode === "vote" ||
    mode === "panel" ||
    mode === "challenge" ||
    mode === "challenge-panel"
  )
    return (
      <main className={styles.shell}>
        <AppHeader language={language} setLanguage={setLanguage} onBack={goHome} />
        <section className={styles.card}>
          <div className={styles.quizLoading} role="status">
            <i className={styles.spinner} />
            <strong>{en ? "Loading quiz…" : "Carregando quiz…"}</strong>
            <span>
              {en
                ? "Preparing your question and image."
                : "Preparando sua pergunta e imagem."}
            </span>
          </div>
        </section>
      </main>
    );

  return (
    <main className={styles.shell}>
      <AppHeader language={language} setLanguage={setLanguage} onBack={goBack} />
      <section className={styles.dashboard}>
        <header>
          <div>
            <span className={styles.kicker}>
              {en ? "QUIZ HISTORY" : "HISTÓRICO DE QUIZZES"}
            </span>
            <h1>{en ? "Previous quizzes." : "Quizzes anteriores."}</h1>
            <p>
              {en
                ? "Open a teacher panel and its QR Code."
                : "Abra o painel do professor e o QR Code de cada quiz."}
            </p>
          </div>
          <button className={styles.primary} onClick={startCreate}>
            {en ? "+ Create quiz" : "+ Criar quiz"}
          </button>
        </header>
        <div className={styles.list}>
          {!questionsLoaded ? (
            <div className={styles.historyLoading} role="status">
              <i className={styles.spinner} />
              {en ? "Loading quizzes…" : "Carregando quizzes…"}
            </div>
          ) : questions.length ? (
            questions.map((item) => {
              const responseCount = item.responseCount ?? 0;
              const type =
                item.kind === "cloud"
                  ? en
                    ? "WORD CLOUD"
                    : "NUVEM DE PALAVRAS"
                  : item.kind === "open"
                    ? en
                      ? "OPEN RESPONSE"
                      : "RESPOSTA ABERTA"
                    : en
                      ? "MULTIPLE CHOICE"
                      : "MÚLTIPLA ESCOLHA";
              const answerLabel = en
                ? responseCount === 1
                  ? "answer"
                  : "answers"
                : responseCount === 1
                  ? "resposta"
                  : "respostas";
              return (
                <div className={styles.listItem} key={item.id}>
                  <a href={`?q=${item.id}&painel=1`}>
                    <div className={styles.questionCardMain}>
                      <span className={styles.questionType}>{type}</span>
                      <b>{item.title}</b>
                      <small>
                        {en ? "Quiz" : "Questão"} {item.id} · {responseCount}{" "}
                        {answerLabel}
                      </small>
                    </div>
                    <span className={styles.cardArrow} aria-hidden="true">
                      →
                    </span>
                  </a>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editQuestion}
                      onClick={() => startEdit(item.id)}
                      aria-label={
                        en ? `Edit "${item.title}"` : `Editar "${item.title}"`
                      }
                      title={en ? "Edit quiz" : "Editar quiz"}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className={styles.deleteQuestion}
                      onClick={() => deleteQuestion(item.id, item.title)}
                      aria-label={
                        en
                          ? `Delete "${item.title}"`
                          : `Excluir "${item.title}"`
                      }
                      title={en ? "Delete quiz" : "Excluir quiz"}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.empty}>
              {en
                ? "There are no questions yet. Create the first one to begin."
                : "Ainda não há quizzes. Crie o primeiro para começar."}
            </div>
          )}
        </div>
      </section>
      <section className={styles.dashboard} style={{ marginTop: 24 }}>
        <header>
          <div>
            <span className={styles.kicker}>
              {en ? "TROPHY CHALLENGE HISTORY" : "HISTÓRICO DE DESAFIOS TROFÉU"}
            </span>
            <h1>
              {en
                ? "Previous trophy challenges."
                : "Desafios troféu anteriores."}
            </h1>
            <p>
              {en
                ? "Open a challenge's teacher panel to check scores or add its QR Code again."
                : "Abra o painel do professor de um desafio para conferir a pontuação ou pegar o QR Code de novo."}
            </p>
          </div>
        </header>
        <div className={styles.list}>
          {!challengeListLoaded ? (
            <div className={styles.historyLoading} role="status">
              <i className={styles.spinner} />
              {en ? "Loading trophy challenges…" : "Carregando desafios troféu…"}
            </div>
          ) : challengeList.length ? (
            challengeList.map((item) => (
              <div className={styles.listItem} key={item.id}>
                <a href={`?trofeu=${item.id}&painel=1`}>
                  <div className={styles.questionCardMain}>
                    <span className={styles.questionType}>
                      {en ? "TROPHY CHALLENGE" : "DESAFIO TROFÉU"}
                    </span>
                    <b>{item.title}</b>
                    <small>
                      {en ? "Challenge" : "Desafio"} {item.id}
                    </small>
                  </div>
                  <span className={styles.cardArrow} aria-hidden="true">
                    →
                  </span>
                </a>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editQuestion}
                    onClick={() => startEditChallenge(item.id)}
                    aria-label={
                      en ? `Edit "${item.title}"` : `Editar "${item.title}"`
                    }
                    title={en ? "Edit challenge" : "Editar desafio"}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className={styles.deleteQuestion}
                    onClick={() => deleteChallenge(item.id, item.title)}
                    aria-label={
                      en ? `Delete "${item.title}"` : `Excluir "${item.title}"`
                    }
                    title={en ? "Delete challenge" : "Excluir desafio"}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>
              {en
                ? "No trophy challenges yet."
                : "Ainda não há desafios troféu."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
