"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Kit, QuestionCategory, Difficulty, Confidence, GenerationMeta } from "./types";

export function kitQueryKey(id: string) {
  return ["kit", id];
}

export function useKit(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: kitQueryKey(id),
    queryFn: () => api.get<{ kit: Kit; meta?: GenerationMeta }>(`/api/kits/${id}`),
  });

  const setKit = useCallback(
    (kit: Kit) => {
      queryClient.setQueryData(kitQueryKey(id), (prev: { kit: Kit; meta?: GenerationMeta } | undefined) => ({
        kit,
        meta: prev?.meta,
      }));
    },
    [queryClient, id],
  );

  const updateCompanyBrief = useMutation({
    mutationFn: (patch: { summary?: string; what_they_do?: string }) =>
      api.patch<{ kit: Kit }>(`/api/kits/${id}/company-brief`, patch),
    onSuccess: (res) => setKit(res.kit),
  });

  const pinCompanyBrief = useMutation({
    mutationFn: (pinned: boolean) => api.post<{ kit: Kit }>(`/api/kits/${id}/company-brief/pin`, { pinned }),
    onSuccess: (res) => setKit(res.kit),
  });

  const regenerateCompanyBrief = useMutation({
    mutationFn: (force: boolean) => api.post<{ kit: Kit }>(`/api/kits/${id}/company-brief/regenerate`, { force }),
    onSuccess: (res) => setKit(res.kit),
  });

  const addQuestion = useMutation({
    mutationFn: (input: {
      category: QuestionCategory;
      prompt: string;
      answer_outline: string;
      difficulty: Difficulty;
      requirement_ids?: string[];
    }) => api.post<{ kit: Kit }>(`/api/kits/${id}/questions`, input),
    onSuccess: (res) => setKit(res.kit),
  });

  const updateQuestion = useMutation({
    mutationFn: ({ qid, patch }: { qid: string; patch: Record<string, unknown> }) =>
      api.patch<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}`, patch),
    onSuccess: (res) => setKit(res.kit),
  });

  const deleteQuestion = useMutation({
    mutationFn: (qid: string) => api.delete<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}`),
    onSuccess: (res) => setKit(res.kit),
  });

  const reorderQuestions = useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.post<{ kit: Kit }>(`/api/kits/${id}/questions/reorder`, { ordered_ids: orderedIds }),
    onSuccess: (res) => setKit(res.kit),
  });

  const pinQuestion = useMutation({
    mutationFn: ({ qid, pinned }: { qid: string; pinned: boolean }) =>
      api.post<{ kit: Kit }>(`/api/kits/${id}/questions/${qid}/pin`, { pinned }),
    onSuccess: (res) => setKit(res.kit),
  });

  const regenerateQuestions = useMutation({
    mutationFn: ({ category, force = false }: { category: QuestionCategory; force?: boolean }) =>
      api.post<{ kit: Kit }>(`/api/kits/${id}/questions/regenerate`, { category, force }),
    onSuccess: (res) => setKit(res.kit),
  });

  const addFlashcard = useMutation({
    mutationFn: (input: { front: string; back: string; requirement_ids?: string[] }) =>
      api.post<{ kit: Kit }>(`/api/kits/${id}/flashcards`, input),
    onSuccess: (res) => setKit(res.kit),
  });

  const updateFlashcard = useMutation({
    mutationFn: ({ fid, patch }: { fid: string; patch: Record<string, unknown> }) =>
      api.patch<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}`, patch),
    onSuccess: (res) => setKit(res.kit),
  });

  const deleteFlashcard = useMutation({
    mutationFn: (fid: string) => api.delete<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}`),
    onSuccess: (res) => setKit(res.kit),
  });

  const pinFlashcard = useMutation({
    mutationFn: ({ fid, pinned }: { fid: string; pinned: boolean }) =>
      api.post<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}/pin`, { pinned }),
    onSuccess: (res) => setKit(res.kit),
  });

  const practiceFlashcard = useMutation({
    mutationFn: ({ fid, confidence }: { fid: string; confidence: Confidence }) =>
      api.post<{ kit: Kit }>(`/api/kits/${id}/flashcards/${fid}/practice`, { confidence }),
    onSuccess: (res) => setKit(res.kit),
  });

  const regenerateFlashcards = useMutation({
    mutationFn: (force: boolean) => api.post<{ kit: Kit }>(`/api/kits/${id}/flashcards/regenerate`, { force }),
    onSuccess: (res) => setKit(res.kit),
  });

  const regenerateSchedule = useMutation({
    mutationFn: (days?: number) => api.post<{ kit: Kit }>(`/api/kits/${id}/schedule/regenerate`, days ? { days } : {}),
    onSuccess: (res) => setKit(res.kit),
  });

  return {
    query,
    updateCompanyBrief,
    pinCompanyBrief,
    regenerateCompanyBrief,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    pinQuestion,
    regenerateQuestions,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    pinFlashcard,
    practiceFlashcard,
    regenerateFlashcards,
    regenerateSchedule,
  };
}
