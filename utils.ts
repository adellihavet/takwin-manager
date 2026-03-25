import { format, eachDayOfInterval, isFriday, parseISO, isSameDay, isSaturday } from 'date-fns';
import { arDZ } from 'date-fns/locale';

export const formatDate = (dateStr: string) => {
  return format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: arDZ });
};

// تم استعادة هذه الدالة لإصلاح خطأ الكونسول
export const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSessionDays = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = eachDayOfInterval({ start, end });
  
  // المنطق الخاص بالدورة الثانية في الجزائر 2026
  if (startDate === '2026-03-28' && endDate === '2026-04-25') {
    return days.filter(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      if (dayStr >= '2026-03-28' && dayStr <= '2026-04-02') {
        return !isFriday(day);
      }
      if (dayStr > '2026-04-02') {
        return isSaturday(day);
      }
      return false;
    });
  }

  return days.filter(day => !isFriday(day));
};

export const isHoliday = (date: Date) => {
  if (date.getMonth() === 6 && date.getDate() === 5) return true;
  return false;
};

export const getWorkingDays = (startDate: string, endDate: string) => {
  const days = getSessionDays(startDate, endDate);
  return days.filter(d => !isHoliday(d));
};

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