// Entrance exams: always show the exam mode (metadata.mode). The API subtitle for exams can be the
// 'true'/'false' eligibility flag, which is not meant to be shown to users.
const FLAG_VALUES = ['true', 'false', 'null', 'undefined'];

export function getResultSubtitle(item) {
  const isExam = item?.type === 'entranceexam' || item?.group === 'entranceExams';
  if (isExam) {
    const mode = String(item?.metadata?.mode ?? '').trim();
    return mode && !FLAG_VALUES.includes(mode.toLowerCase()) ? `Mode: ${mode}` : 'Entrance Exam';
  }
  const subtitle = String(item?.subtitle ?? '').trim();
  return FLAG_VALUES.includes(subtitle.toLowerCase()) ? '' : subtitle;
}
