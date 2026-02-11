const zeroPad = (input: number) => String(input).padStart(2, "0");

export const dateToLocal = (date: Date) => {
  if (!date) return "";

  return date.getFullYear() + "-" +
    zeroPad(date.getMonth() + 1) + "-" +
    zeroPad(date.getDate()) + "T" + zeroPad(date.getHours()) + ":" +
    zeroPad(date.getMinutes());
};
