export const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const getBiWeeklyPeriodRange = (dateStr: string): { start: Date, end: Date } => {
  // Parse YYYY-MM-DD manually to avoid timezone issues
  // dateStr is expected to be YYYY-MM-DD (e.g., from input type="date")
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // 0-indexed
  const day = parseInt(parts[2]);

  let startDay = 1;
  let endDay = 15;

  if (day > 15) {
    startDay = 16;
    endDay = getDaysInMonth(year, month);
  }

  // Create dates at UTC or consistent timezone to avoid offsets?
  // Usually simpler to use strings for YYYY-MM-DD but Prisma uses DateTime.
  // We will return Date objects set to noon to avoid boundary issues.

  const start = new Date(year, month, startDay);
  const end = new Date(year, month, endDay);

  return { start, end };
};
