"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { saveKnowledgeAnswers } from "@/actions/knowledge.actions";
import type { CompletionQuestion } from "../domain/types";

interface Props {
  questions: CompletionQuestion[];
  onSaved: () => void;
}

/**
 * Phase 3 smart questionnaire — ask only what is missing, never long forms.
 * Action questions deep-link to the correct admin page; text/choice questions
 * are answered inline and persisted as declared facts by the Completion Engine.
 */
export function CompletionQuestionnaire({ questions, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const question of questions) {
      if (question.currentValue !== undefined && question.currentValue !== null && question.currentValue !== "") {
        initial[question.fieldId] = question.currentValue;
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const answerable = useMemo(() => questions.filter((q) => q.type !== "action"), [questions]);
  const actions = useMemo(() => questions.filter((q) => q.type === "action"), [questions]);

  const setValue = useCallback((fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const submit = async () => {
    const answers = answerable
      .filter((q) => values[q.fieldId] !== undefined)
      .map((q) => ({ fieldId: q.fieldId, value: values[q.fieldId] }));

    if (answers.length === 0) {
      setNotice("Nothing to save yet — answer a question or follow the quick actions.");
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const result = await saveKnowledgeAnswers(answers);
      if (result.success) {
        setNotice("Saved. Your knowledge score just updated.");
        onSaved();
      } else {
        const fieldErrors: Record<string, string> = {};
        for (const err of result.errors ?? []) fieldErrors[err.fieldId] = err.message;
        setErrors(fieldErrors);
        setNotice(result.error ?? "Some answers could not be saved.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-sm text-zinc-400">
        No missing knowledge to ask about right now — keep improving and your score stays up to date.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-s8ul-cyan" />
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Complete your profile</p>
      </div>
      <p className="mt-1 text-[11px] text-zinc-600">
        Just a few targeted questions — we only ask for what&apos;s missing.
      </p>

      <div className="mt-4 space-y-4">
        {answerable.map((question) => (
          <div key={question.id}>
            <label className="mb-1.5 block text-sm font-medium text-zinc-200">
              {question.prompt}
              {question.required && <span className="ml-1 text-s8ul-cyan">*</span>}
            </label>

            {question.type === "choice" && (
              <div className="flex flex-wrap gap-2">
                {question.options?.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue(question.fieldId, option.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      values[question.fieldId] === option.value
                        ? "border-s8ul-cyan bg-s8ul-cyan/10 text-s8ul-cyan"
                        : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {question.type === "multichoice" && (
              <div className="flex flex-wrap gap-2">
                {question.options?.map((option) => {
                  const selected = Array.isArray(values[question.fieldId]) &&
                    (values[question.fieldId] as string[]).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(values[question.fieldId]) ? [...(values[question.fieldId] as string[])] : [];
                        const next = selected ? current.filter((v) => v !== option.value) : [...current, option.value];
                        setValue(question.fieldId, next);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        selected
                          ? "border-s8ul-cyan bg-s8ul-cyan/10 text-s8ul-cyan"
                          : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === "text" && (
              <input
                className="admin-input w-full"
                placeholder={question.placeholder}
                value={(values[question.fieldId] as string) ?? ""}
                onChange={(e) => setValue(question.fieldId, e.target.value)}
              />
            )}

            {question.type === "textarea" && (
              <textarea
                className="admin-input min-h-[80px] w-full resize-y"
                placeholder={question.placeholder}
                value={(values[question.fieldId] as string) ?? ""}
                onChange={(e) => setValue(question.fieldId, e.target.value)}
              />
            )}

            {errors[question.fieldId] && (
              <p className="mt-1 text-xs text-rose-400">{errors[question.fieldId]}</p>
            )}
          </div>
        ))}

        {answerable.length > 0 && (
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save answers
          </button>
        )}

        {notice && <p className="text-xs text-zinc-400">{notice}</p>}
      </div>

      {actions.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            {actions.map((question) => (
              <Link
                key={question.id}
                href={question.href ?? "#"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:border-s8ul-cyan/40 hover:text-white transition-colors"
              >
                {question.actionLabel}
                <ArrowRight className="h-3 w-3 text-s8ul-cyan" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
