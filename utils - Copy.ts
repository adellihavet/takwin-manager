import { format, eachDayOfInterval, isFriday, parseISO, isSameDay } from 'date-fns';
import { arDZ } from 'date-fns/locale';

export const formatDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: arDZ });
};

export const getSessionDays = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = eachDayOfInterval({ start, end });
  
  // Filter out Fridays
  return days.filter(day => !isFriday(day));
};

export const isHoliday = (date: Date) => {
  // Check specifically for July 5th
  if (date.getMonth() === 6 && date.getDate() === 5) return true;
  return false;
};

export const getWorkingDays = (startDate: string, endDate: string) => {
  const days = getSessionDays(startDate, endDate);
  return days.filter(d => !isHoliday(d));
};

// Database Helpers
export const downloadJSON = (data: object, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readJSONFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};