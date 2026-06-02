export type JalaliOccasion = {
  title: string;
  isOfficialHoliday: boolean;
};

const fixedJalaliOccasions: Record<string, JalaliOccasion[]> = {
  "1-1": [{ title: "نوروز", isOfficialHoliday: true }],
  "1-2": [{ title: "عید نوروز", isOfficialHoliday: true }],
  "1-3": [{ title: "عید نوروز", isOfficialHoliday: true }],
  "1-4": [{ title: "عید نوروز", isOfficialHoliday: true }],
  "1-12": [{ title: "روز جمهوری اسلامی", isOfficialHoliday: true }],
  "1-13": [{ title: "روز طبیعت", isOfficialHoliday: true }],
  "3-14": [{ title: "رحلت امام خمینی", isOfficialHoliday: true }],
  "3-15": [{ title: "قیام ۱۵ خرداد", isOfficialHoliday: true }],
  "11-22": [{ title: "پیروزی انقلاب اسلامی", isOfficialHoliday: true }],
  "12-29": [{ title: "ملی شدن صنعت نفت", isOfficialHoliday: true }],
};

// TODO: Add year-aware lunar occasions such as Eid al-Fitr, Tasua, Ashura,
// Eid al-Adha, and Eid al-Ghadir when a reliable conversion/data source is added.
export function getJalaliDayOccasions(
  _year: number,
  month: number,
  day: number,
) {
  return fixedJalaliOccasions[`${month}-${day}`] ?? [];
}

export function isJalaliOfficialHoliday(
  year: number,
  month: number,
  day: number,
) {
  return getJalaliDayOccasions(year, month, day).some(
    (occasion) => occasion.isOfficialHoliday,
  );
}
