export type ProgressDiscipline = { code: string; name: string; lessons: number; lessonsDone: number; exercises: number; exercisesDone: number; assignments: number; assignmentsDone: number; exam: string; daysUntilExam: number };

export function getDisciplineProgress(discipline: ProgressDiscipline) {
  const total = discipline.lessons + discipline.exercises + discipline.assignments;
  const rawDone = discipline.lessonsDone + discipline.exercisesDone + discipline.assignmentsDone;
  const done = Math.min(total, Math.max(0, rawDone));
  return { total, done, pending: Math.max(0, total - done), percent: total ? Math.min(100, Math.round((done / total) * 100)) : 0 };
}

export function getAcademicProgress(disciplines: ProgressDiscipline[]) {
  const totals = disciplines.reduce((acc, discipline) => { const p = getDisciplineProgress(discipline); return { done: acc.done + p.done, total: acc.total + p.total }; }, { done: 0, total: 0 });
  const done = Math.min(totals.total, Math.max(0, totals.done));
  return { done, total: totals.total, pending: Math.max(0, totals.total - done), percent: totals.total ? Math.min(100, Math.round((done / totals.total) * 100)) : 0 };
}
