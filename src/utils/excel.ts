import * as ExcelJS from 'exceljs';

export function exportAttendance(attendances: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Header row
  worksheet.columns = [
    { header: 'Employee', key: 'employee', width: 25 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Check In', key: 'checkIn', width: 15 },
    { header: 'Check Out', key: 'checkOut', width: 15 },
    { header: 'Working Hours', key: 'workingHours', width: 20 },
  ];

  // Add rows
  attendances.forEach((a) => {
    worksheet.addRow({
      employee: a.user?.name,
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      workingHours: a.workingHours,
    });
  });
}
