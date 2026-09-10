"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Kit, Question, QuestionCategory } from "@/lib/types";
import type { useKit } from "@/lib/useKit";
import { AutoSaveField } from "@/components/AutoSaveField";
import { StateBadge } from "@/components/kit/StateBadge";
import { SectionHeader } from "@/components/kit/SectionHeader";
import { Spinner } from "@/components/Spinner";

interface Props {
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};
const CATEGORY_ACCENT: Record<QuestionCategory, string> = {
  technical: "border-l-brand-400",
  behavioural: "border-l-violet-400",
  "system-design": "border-l-sky-400",
  "company-fit": "border-l-amber-400",
};
const DIFFICULTY_LABEL: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_DOT: Record<number, string> = { 1: "bg-emerald-400", 2: "bg-amber-400", 3: "bg-rose-400" };

export function QuestionsTab({ kit, controls }: Props) {
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = kit.questions.map((q) => q.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const reordered = [...ids];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, String(active.id));
    controls.reorderQuestions.mutate(reordered);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionHeader
          icon="Questions"
          title="Regenerate by category"
          subtitle="Replaces auto-generated questions in that category. Edited or pinned questions are kept."
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="btn-secondary text-xs"
              disabled={controls.regenerateQuestions.isPending}
              onClick={() => controls.regenerateQuestions.mutate({ category: cat })}
            >
              {controls.regenerateQuestions.isPending && <Spinner className="h-3.5 w-3.5" />}
              Regenerate {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <button className="btn-primary ml-auto text-xs" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "+ Add question"}
          </button>
        </div>
      </div>

      {adding && (
        <AddQuestionForm
          kit={kit}
          onAdd={async (input) => {
            await controls.addQuestion.mutateAsync(input);
            setAdding(false);
          }}
        />
      )}

      {kit.questions.length === 0 ? (
        <p className="card text-sm text-slate-500">No questions yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={kit.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {kit.questions.map((q) => (
                <SortableQuestionItem key={q.id} question={q} kit={kit} controls={controls} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableQuestionItem({
  question,
  kit,
  controls,
}: {
  question: Question;
  kit: Kit;
  controls: ReturnType<typeof useKit>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`card border-l-4 ${CATEGORY_ACCENT[question.category]} ${isDragging ? "shadow-card-hover" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <circle cx="7" cy="5" r="1.3" />
            <circle cx="13" cy="5" r="1.3" />
            <circle cx="7" cy="10" r="1.3" />
            <circle cx="13" cy="10" r="1.3" />
            <circle cx="7" cy="15" r="1.3" />
            <circle cx="13" cy="15" r="1.3" />
          </svg>
        </button>
        <select
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          value={question.category}
          onChange={(e) =>
            controls.updateQuestion.mutate({ qid: question.id, patch: { category: e.target.value } })
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          className="flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          value={question.difficulty}
          onChange={(e) =>
            controls.updateQuestion.mutate({ qid: question.id, patch: { difficulty: Number(e.target.value) } })
          }
        >
          {[1, 2, 3].map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
        <span className={`h-2 w-2 rounded-full ${DIFFICULTY_DOT[question.difficulty]}`} title={DIFFICULTY_LABEL[question.difficulty]} />
        <StateBadge state={question.state} />
        <div className="ml-auto flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => controls.pinQuestion.mutate({ qid: question.id, pinned: question.state !== "pinned" })}
          >
            {question.state === "pinned" ? "Unpin" : "Pin"}
          </button>
          <button className="btn-danger text-xs" onClick={() => controls.deleteQuestion.mutate(question.id)}>
            Delete
          </button>
        </div>
      </div>

      <label className="label">Prompt</label>
      <AutoSaveField
        multiline
        value={question.prompt}
        onSave={(prompt) => controls.updateQuestion.mutateAsync({ qid: question.id, patch: { prompt } })}
        ariaLabel="Question prompt"
      />

      <label className="label mt-3">Answer outline</label>
      <AutoSaveField
        multiline
        value={question.answer_outline}
        onSave={(answer_outline) =>
          controls.updateQuestion.mutateAsync({ qid: question.id, patch: { answer_outline } })
        }
        ariaLabel="Answer outline"
      />

      {question.requirement_ids.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {question.requirement_ids.map((rid) => {
            const req = kit.role.requirements.find((r) => r.id === rid);
            return (
              <span key={rid} className="badge bg-slate-100 text-slate-600" title={req?.text}>
                {req?.text.slice(0, 30) ?? rid}
                {req && req.text.length > 30 ? "…" : ""}
              </span>
            );
          })}
        </div>
      )}
    </li>
  );
}

function AddQuestionForm({
  kit,
  onAdd,
}: {
  kit: Kit;
  onAdd: (input: {
    category: QuestionCategory;
    prompt: string;
    answer_outline: string;
    difficulty: 1 | 2 | 3;
    requirement_ids: string[];
  }) => Promise<void>;
}) {
  const [category, setCategory] = useState<QuestionCategory>("technical");
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [requirementIds, setRequirementIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleRequirement(id: string) {
    setRequirementIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!prompt.trim() || !answerOutline.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ category, prompt, answer_outline: answerOutline, difficulty, requirement_ids: requirementIds });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card animate-fade-in-up space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Add a question</h3>
      <div className="flex gap-2">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as QuestionCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select className="input" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}>
          {[1, 2, 3].map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="input resize-y"
        rows={2}
        placeholder="Question prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <textarea
        className="input resize-y"
        rows={2}
        placeholder="Answer outline"
        value={answerOutline}
        onChange={(e) => setAnswerOutline(e.target.value)}
      />
      {kit.role.requirements.length > 0 && (
        <div>
          <p className="label">Related requirements (optional)</p>
          <div className="flex flex-wrap gap-2">
            {kit.role.requirements.map((r) => (
              <label
                key={r.id}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  requirementIds.includes(r.id)
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={requirementIds.includes(r.id)}
                  onChange={() => toggleRequirement(r.id)}
                  className="sr-only"
                />
                {r.text.slice(0, 24)}
              </label>
            ))}
          </div>
        </div>
      )}
      <button className="btn-primary text-xs" disabled={submitting} onClick={handleSubmit}>
        {submitting && <Spinner className="h-3.5 w-3.5" />}
        {submitting ? "Adding..." : "Add question"}
      </button>
    </div>
  );
}
