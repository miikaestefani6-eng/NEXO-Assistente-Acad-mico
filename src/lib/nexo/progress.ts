export type ProgressDiscipline = { code: string; name: string; lessons: number; lessonsDone: number; exercises: number; exercisesDone: number; assignments: number; assignmentsDone: number; exam: string; daysUntilExam: number };

export function getDisciplineProgress(discipline: ProgressDiscipline) {
  const total = discipline.lessons + discipline.exercises + discipline.assignments;
  const done = discipline.lessonsDone + discipline.exercisesDone + discipline.assignmentsDone;
  return { total, done, pending: Math.max(0, total - done), percent: total ? Math.round((done / total) * 100) : 0 };
}

export function getAcademicProgress(disciplines: ProgressDiscipline[]) {
  const totals = disciplines.reduce((acc, discipline) => { const p = getDisciplineProgress(discipline); return { done: acc.done + p.done, total: acc.total + p.total }; }, { done: 0, total: 0 });
  return { ...totals, pending: Math.max(0, totals.total - totals.done), percent: totals.total ? Math.round((totals.done / totals.total) * 100) : 0 };
}
