export function excelDateToJSDate(serial: number): Date {
  // 1. Get the integer part = whole days
  const daysSinceUnixEpoch = Math.floor(serial) - 25569; // 25569 = days between 1900-01-01 and 1970-01-01

  // 2. Convert days to milliseconds
  const date = new Date(daysSinceUnixEpoch * 24 * 60 * 60 * 1000);

  // 3. Get the fractional part = time fraction of the day
  const fractionalDay = serial - Math.floor(serial);

  // 4. Convert fraction of a day → seconds
  const totalSeconds = Math.round(fractionalDay * 24 * 60 * 60);

  // 5. Add seconds to date
  date.setSeconds(date.getSeconds() + totalSeconds);

  return date;
}
