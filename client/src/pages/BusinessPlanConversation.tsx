import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO_FULL } from "@/const";
import {
  getRestorableBusinessPlanUnitIndex,
  loadBusinessPlanDraft,
  saveBusinessPlanDraft,
  type BusinessPlanDraftAnswer,
  type BusinessPlanDraftRow,
  type BusinessPlanScoreMatrixAnswer,
} from "@/lib/businessPlanDraft";
import {
  BUSINESS_PLAN_QUESTIONS,
  BUSINESS_PLAN_SECTIONS,
  type BPCardListQuestion,
  type BPField,
  type BPQuestion,
  type BPScoreMatrixQuestion,
  type BPTableQuestion,
  type BPTextQuestion,
} from "./businessPlanQuestionnaire";
import { resolveBusinessPlanSingleOption } from "./businessPlanConversationProtocol";

type Answers = Record<string, BusinessPlanDraftAnswer>;
type ConversationUnit = BPQuestion & { sectionIntro: string };

const CONVERSATION_UNITS: ConversationUnit[] = BUSINESS_PLAN_QUESTIONS.map(question => ({
  ...question,
  sectionIntro: BUSINESS_PLAN_SECTIONS.find(section => section.id === question.section)!.intro,
}));
const TOTAL_QUESTIONS = CONVERSATION_UNITS.length;
const INPUT_CLASS = "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--acc)] focus:ring-2 focus:ring-[rgba(201,162,75,.2)]";

function AdvisorMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--pri)] text-xs font-semibold text-white">泽</div><div className="max-w-[88%] whitespace-pre-line rounded-2xl rounded-tl-md border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 shadow-sm">{children}</div></div>;
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end"><div className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-tr-md bg-[var(--pri)] px-4 py-3 text-sm leading-6 text-white">{children}</div></div>;
}

function fieldValues(question: BPTextQuestion, answers: Answers): BPField[] {
  return question.fields ?? [{ id: question.field!, label: "", type: question.type, placeholder: question.placeholder, unit: question.unit }];
}

function answerSummary(answer: BusinessPlanDraftAnswer | undefined): string {
  if (typeof answer === "string") return answer;
  if (Array.isArray(answer)) {
    const values = answer
      .flatMap(row => Object.values(row))
      .filter(value => value !== null && String(value).trim())
      .map(String);
    return values.length ? values.slice(0, 3).join(" · ") : "已填写";
  }
  if (answer) return "已完成竞争对比";
  return "";
}

function TextAnswer({ question, answers, onComplete }: { question: BPTextQuestion; answers: Answers; onComplete: (summary: string, fields: Record<string, string>) => void }) {
  const fields = fieldValues(question, answers);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.id, String(answers[field.id] ?? "")] )));
  const submit = () => onComplete(fields.map(field => values[field.id] ?? "").filter(Boolean).join("\n"), values);
  return <div className="ml-11 max-w-[620px] space-y-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
    {fields.map(field => <label key={field.id} className="block space-y-1.5"><span className="text-xs font-semibold text-[#586158]">{field.label}</span><div className="relative">{field.type === "textarea" ? <textarea value={values[field.id] ?? ""} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} onKeyDown={event => { if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder={field.placeholder} rows={4} className={`${INPUT_CLASS} resize-y pr-12`} /> : <input type={field.type === "number" ? "number" : "text"} value={values[field.id] ?? ""} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder={field.placeholder} className={INPUT_CLASS} />}{field.unit ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#798078]">{field.unit}</span> : null}</div></label>)}
    <button type="button" onClick={submit} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--pri)] px-3.5 py-2 text-sm font-semibold text-white"><Send className="h-3.5 w-3.5" />发送</button>
  </div>;
}

function SingleAnswer({ question, answers, onComplete }: { question: Extract<BPQuestion, { type: "single" }>; answers: Answers; onComplete: (value: string) => void }) {
  const [reply, setReply] = useState("");
  const submitReply = () => { const value = resolveBusinessPlanSingleOption(reply, question.options); if (value) onComplete(value); };
  return <div className="ml-11 max-w-[620px] space-y-3"><div className="rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm">{question.options.map((option, index) => <button key={option} type="button" onClick={() => onComplete(option)} className="mb-2 flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-left text-sm hover:border-[var(--acc)] hover:bg-[#fffcf3]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#f2f0e9] text-xs font-bold text-[var(--pri)]">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div><div className="flex gap-2"><input value={reply} onChange={event => setReply(event.target.value)} onKeyDown={event => { if (event.key === "Enter") submitReply(); }} placeholder="也可以输入选项字母，如 A" className={INPUT_CLASS} /><button type="button" onClick={submitReply} className="rounded-xl bg-[var(--pri)] px-3 text-white"><Send className="h-4 w-4" /></button></div></div>;
}

function CardListAnswer({ question, answers, onComplete }: { question: BPCardListQuestion; answers: Answers; onComplete: (rows: BusinessPlanDraftRow[]) => void }) {
  const minimum = question.minCards ?? 1;
  const echoed = question.echoFrom && Array.isArray(answers[question.echoFrom.field]) ? answers[question.echoFrom.field] as BusinessPlanDraftRow[] : [];
  const initialRows = (): BusinessPlanDraftRow[] => {
    const saved = answers[question.field];
    if (Array.isArray(saved)) return saved as BusinessPlanDraftRow[];
    if (question.echoFrom) return (echoed.length ? echoed : Array.from({ length: minimum }, () => ({}))).map(row => ({ [question.echoFrom!.targetField]: String(row[question.echoFrom!.itemField] ?? "") }));
    return Array.from({ length: minimum }, () => ({}));
  };
  const [rows, setRows] = useState<BusinessPlanDraftRow[]>(initialRows);
  const canAdd = question.addable !== false && rows.length < (question.maxCards ?? Infinity) && !question.echoFrom;
  const canDelete = question.addable !== false && rows.length > minimum && !question.echoFrom;
  const update = (rowIndex: number, field: string, value: string) => setRows(current => current.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row));
  return <div className="ml-11 max-w-[680px] space-y-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">{rows.map((row, rowIndex) => <div key={rowIndex} className="relative space-y-3 rounded-xl border border-[#ebe8df] bg-[#fdfcf8] p-3"><div className="text-xs font-semibold text-[var(--pri)]">第 {rowIndex + 1} 项</div>{canDelete ? <button type="button" onClick={() => setRows(current => current.filter((_, index) => index !== rowIndex))} className="absolute right-2 top-2 rounded p-1 text-[#8a625e]"><Trash2 className="h-4 w-4" /></button> : null}{question.fields.map(field => <label key={field.id} className="block space-y-1"><span className="text-xs text-[#586158]">{field.label}</span>{field.type === "textarea" ? <textarea value={String(row[field.id] ?? "")} readOnly={field.readonly} onChange={event => update(rowIndex, field.id, event.target.value)} rows={3} className={`${INPUT_CLASS} resize-y ${field.readonly ? "bg-[#f1f0eb]" : ""}`} /> : <input value={String(row[field.id] ?? "")} readOnly={field.readonly} type={field.type === "number" ? "number" : "text"} onChange={event => update(rowIndex, field.id, event.target.value)} className={`${INPUT_CLASS} ${field.readonly ? "bg-[#f1f0eb]" : ""}`} />}</label>)}</div>)}{canAdd ? <button type="button" onClick={() => setRows(current => [...current, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--pri)]"><Plus className="h-4 w-4" />再加一个</button> : null}<button type="button" onClick={() => onComplete(rows)} className="ml-3 inline-flex items-center gap-1 rounded-xl bg-[var(--pri)] px-3.5 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" />完成本题</button></div>;
}

function TableAnswer({ question, answers, onComplete }: { question: BPTableQuestion; answers: Answers; onComplete: (rows: BusinessPlanDraftRow[]) => void }) {
  const minimum = question.minRows ?? question.fixedRows?.length ?? 1;
  const initialRows = (): BusinessPlanDraftRow[] => { const saved = answers[question.field]; return Array.isArray(saved) ? saved as BusinessPlanDraftRow[] : question.fixedRows ?? question.initialRows ?? Array.from({ length: minimum }, () => ({})); };
  const [rows, setRows] = useState<BusinessPlanDraftRow[]>(initialRows);
  const update = (rowIndex: number, field: string, value: string) => setRows(current => current.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row));
  const canDelete = !question.fixedRows && rows.length > minimum;
  const canAdd = question.addable && rows.length < (question.maxRows ?? Infinity);
  return <div className="ml-11 max-w-[680px] space-y-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[460px] border-collapse text-sm"><thead><tr>{question.columns.map(column => <th key={column.id} className="border-b border-[var(--line)] px-2 py-2 text-left text-xs font-semibold text-[#586158]">{column.label}</th>)}{canDelete ? <th /> : null}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{question.columns.map(column => <td key={column.id} className="border-b border-[#efede6] p-1.5"><div className="relative"><input type={column.type === "number" ? "number" : "text"} readOnly={column.readonly} value={String(row[column.id] ?? "")} onChange={event => update(rowIndex, column.id, event.target.value)} className={`w-full rounded-lg border border-[#dfddd4] px-2 py-2 text-sm ${column.readonly ? "bg-[#f1f0eb]" : "bg-white"}`} />{column.unit ? <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#798078]">{column.unit}</span> : null}</div></td>)}{canDelete ? <td className="p-1"><button type="button" onClick={() => setRows(current => current.filter((_, index) => index !== rowIndex))} className="p-1 text-[#8a625e]"><Trash2 className="h-4 w-4" /></button></td> : null}</tr>)}</tbody></table></div>{canAdd ? <button type="button" onClick={() => setRows(current => [...current, {}])} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--pri)]"><Plus className="h-4 w-4" />增加一行</button> : null}<button type="button" onClick={() => onComplete(rows)} className="ml-3 inline-flex items-center gap-1 rounded-xl bg-[var(--pri)] px-3.5 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" />完成本题</button></div>;
}

function ScoreMatrixAnswer({ question, answers, onComplete }: { question: BPScoreMatrixQuestion; answers: Answers; onComplete: (answer: BusinessPlanScoreMatrixAnswer) => void }) {
  const saved = answers[question.field] as BusinessPlanScoreMatrixAnswer | undefined;
  const [columns, setColumns] = useState<string[]>(() => saved?.columns ?? [question.companyName, "", "", ""]);
  const [scores, setScores] = useState<Record<string, Record<string, number | null>>>(() => saved?.scores ?? {});
  const [customDimension, setCustomDimension] = useState(saved?.customDimension ?? "");
  const rows = [...question.rows, ...(customDimension.trim() ? [{ id: "custom", label: customDimension }] : [])];
  const competitors = columns.slice(1);
  const updateScore = (row: string, column: number, score: number) => setScores(current => ({ ...current, [row]: { ...current[row], [String(column)]: score } }));
  return <div className="ml-11 max-w-[700px] space-y-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr><th className="p-2 text-left text-xs text-[#586158]">对比维度</th>{columns.map((column, index) => <th key={index} className="p-2"><div className="flex items-center gap-1"><input value={column} readOnly={index === 0} onChange={event => setColumns(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`竞争对手 ${index}`} className={`w-24 rounded-lg border px-2 py-1.5 text-xs ${index === 0 ? "border-transparent bg-[#f1f0eb]" : "border-[#dfddd4]"}`} />{index > 0 && competitors.length > (question.minColumns ?? 0) ? <button type="button" onClick={() => setColumns(current => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#8a625e]"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div></th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="border-t border-[#efede6] p-2 text-xs font-semibold text-[#586158]">{row.label}</td>{columns.map((_, columnIndex) => <td key={columnIndex} className="border-t border-[#efede6] p-2 text-center">{[1, 2, 3, 4, 5].map(score => <label key={score} className="mx-0.5 inline-flex cursor-pointer items-center"><input type="radio" name={`${row.id}-${columnIndex}`} checked={scores[row.id]?.[String(columnIndex)] === score} onChange={() => updateScore(row.id, columnIndex, score)} className="sr-only" /><span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${scores[row.id]?.[String(columnIndex)] === score ? "bg-[var(--acc)] font-bold text-white" : "bg-[#eeece5] text-[#586158]"}`}>{score}</span></label>)}</td>)}</tr>)}</tbody></table></div>{competitors.length < (question.maxColumns ?? 4) ? <button type="button" onClick={() => setColumns(current => [...current, ""])} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--pri)]"><Plus className="h-4 w-4" />添加竞争对手</button> : null}<label className="block space-y-1"><span className="text-xs text-[#586158]">自定义对比维度（可选，留空则不添加）</span><input value={customDimension} onChange={event => setCustomDimension(event.target.value)} className={INPUT_CLASS} /></label><button type="button" onClick={() => onComplete({ columns, scores, customDimension: customDimension.trim() || undefined })} className="inline-flex items-center gap-1 rounded-xl bg-[var(--pri)] px-3.5 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" />完成本题</button></div>;
}

function ActiveAnswer({ question, answers, onComplete }: { question: BPQuestion; answers: Answers; onComplete: (answer: BusinessPlanDraftAnswer, fields?: Record<string, string>) => void }) {
  if (question.type === "single") return <SingleAnswer question={question} answers={answers} onComplete={value => onComplete(value, { [question.field]: value })} />;
  if (question.type === "card-list") return <CardListAnswer question={question} answers={answers} onComplete={rows => onComplete(rows)} />;
  if (question.type === "table") return <TableAnswer question={question} answers={answers} onComplete={rows => onComplete(rows)} />;
  if (question.type === "score-matrix") return <ScoreMatrixAnswer question={question} answers={answers} onComplete={answer => onComplete(answer)} />;
  return <TextAnswer question={question} answers={answers} onComplete={(summary, fields) => onComplete(summary, fields)} />;
}

export default function BusinessPlanConversation() {
  const [initialDraft] = useState(loadBusinessPlanDraft);
  const [answers, setAnswers] = useState<Answers>(() => initialDraft?.answers ?? {});
  const [customValues] = useState<Record<string, string>>(() => initialDraft?.customValues ?? {});
  const [unitIndex, setUnitIndex] = useState(() => getRestorableBusinessPlanUnitIndex(initialDraft?.conversationUnitIndex, initialDraft?.answers ?? {}, CONVERSATION_UNITS.map(unit => unit.id)));
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const visibleUnits = CONVERSATION_UNITS.slice(0, Math.min(unitIndex + 1, TOTAL_QUESTIONS));
  const activeUnitIndex = editingUnitIndex ?? unitIndex;
  const progress = Math.round((unitIndex / TOTAL_QUESTIONS) * 100);
  const currentQuestion = CONVERSATION_UNITS[activeUnitIndex];
  const displayLabel = (question: ConversationUnit) => question.labelByAnswer ? question.labelByAnswer.values[String(answers[question.labelByAnswer.field] ?? "")] ?? question.label : question.label;

  useEffect(() => { saveBusinessPlanDraft({ answers, customValues, conversationUnitIndex: unitIndex }); }, [answers, customValues, unitIndex]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [editingUnitIndex, unitIndex]);

  const complete = (answer: BusinessPlanDraftAnswer, fields: Record<string, string> = {}) => {
    if (!currentQuestion) return;
    setAnswers(current => ({ ...current, ...fields, [currentQuestion.id]: answer, ...("field" in currentQuestion && currentQuestion.field ? { [currentQuestion.field]: answer } : {}) }));
    if (editingUnitIndex !== null) setEditingUnitIndex(null);
    else setUnitIndex(current => Math.min(current + 1, TOTAL_QUESTIONS));
  };

  return <div className="min-h-screen bg-[var(--bg)] pb-16 text-[var(--ink)]" style={{ "--pri": "#1F3D32", "--acc": "#C9A24B", "--bg": "#FAFAF8", "--ink": "#1E2B25", "--line": "#E6E4DA" } as React.CSSProperties}>
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(250,250,248,.92)] backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-[920px] items-center justify-between gap-6 px-6"><Link href="/" aria-label="泽思 AI 首页"><img src={APP_LOGO_FULL} alt="泽思 AI" className="h-[36px]" /></Link><div className="text-right"><div className="text-xs font-semibold text-[var(--pri)]">商业计划书访谈</div><div className="mt-0.5 text-[11px] text-[#586158]">已完成 {unitIndex} / {TOTAL_QUESTIONS} 题</div></div></div><div className="h-0.5 bg-[#eceadf]"><div className="h-full bg-[var(--acc)] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></header>
    <main className="mx-auto w-full max-w-[720px] px-6 py-12 sm:py-14"><div className="space-y-11"><AdvisorMessage>您好，我是您的泽思商业顾问。{"\n\n"}接下来的十几分钟，我会像一次真正的顾问访谈那样，从项目、客户痛点、产品、市场、竞争、现状、规划、融资、团队这几个方面，系统地了解一下您的生意。{"\n\n"}聊完之后，您会拿到一份从投资人视角出发的商业计划书，可以直接下载 PDF 发给投资人。{"\n\n"}您提供的信息越真实、越具体，这份计划书就越有说服力。也请放心，您的所有信息我们都会严格保密，只用于本次撰写。{"\n\n"}那我们开始吧。</AdvisorMessage>{visibleUnits.map((question, index) => { const active = index === activeUnitIndex; const answer = answers[question.id]; const showIntro = index === 0 || question.section !== visibleUnits[index - 1].section; return <div key={question.id} className="space-y-5">{showIntro ? <AdvisorMessage><span className="text-[#586158]">{question.sectionIntro}</span></AdvisorMessage> : null}<AdvisorMessage><div>{displayLabel(question)}</div>{question.helperText ? <div className="mt-2 text-xs leading-5 text-[#798078]">{question.helperText}</div> : null}</AdvisorMessage>{active ? <div className="space-y-2"><ActiveAnswer key={question.id} question={question} answers={answers} onComplete={complete} />{question.optional ? <div className="ml-11"><button type="button" onClick={() => complete("已跳过")} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#586158]">跳过</button></div> : null}</div> : answer !== undefined ? <div className="space-y-2"><UserBubble>{answerSummary(answer)}</UserBubble><div className="flex justify-end"><button type="button" onClick={() => setEditingUnitIndex(index)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#586158]"><Pencil className="h-3 w-3" />修改</button></div></div> : null}</div>; })}{unitIndex === TOTAL_QUESTIONS && editingUnitIndex === null ? <AdvisorMessage>本轮访谈已完成，商业计划书生成将在后续阶段接入。</AdvisorMessage> : null}<div ref={bottomRef} className="h-4" aria-hidden="true" /></div></main>
  </div>;
}
