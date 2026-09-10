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
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Regenerate by category</h2>
        <p className="mb-3 text-xs text-slate-500">
          Replaces auto-generated questions in that category. Questions you&apos;ve edited or pinned are kept.
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="btn-secondary text-xs"
              disabled={controls.regenerateQuestions.isPending}
              onClick={() => controls.regenerateQuestions.mutate({ category: cat })}
            >
              Regenerate {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <button className="btn-primary ml-auto text-xs" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Add question"}
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
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <li ref={setNodeRef} style={style} className="card">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        <select
          className="rounded border border-slate-300 px-2 py-1 text-xs"
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
          className="rounded border border-slate-300 px-2 py-1 text-xs"
          value={question.difficulty}
          onChange={(e) =>
            controls.updateQuestion.mutate({ qid: question.id, patch: { difficulty: Number(e.target.value) } })
          }
        >
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>
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

      <label className="label mt-2">Answer outline</label>
      <AutoSaveField
        multiline
        value={question.answer_outline}
        onSave={(answer_outline) =>
          controls.updateQuestion.mutateAsync({ qid: question.id, patch: { answer_outline } })
        }
        ariaLabel="Answer outline"
      />

      {question.requirement_ids.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
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
    <div className="card space-y-3">
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
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
        </select>
      </div>
      <textarea
        className="input"
        rows={2}
        placeholder="Question prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <textarea
        className="input"
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
              <label key={r.id} className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={requirementIds.includes(r.id)} onChange={() => toggleRequirement(r.id)} />
                {r.text.slice(0, 24)}
              </label>
            ))}
          </div>
        </div>
      )}
      <button className="btn-primary text-xs" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Adding..." : "Add question"}
      </button>
    </div>
  );
}
