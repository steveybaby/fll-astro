interface CalendarEvent {
  title: string;
  date: Date;
  duration: number; // in hours
  description?: string;
  location?: string;
}

export function generateICSFile(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDate = formatDate(event.date);
  const endDate = new Date(event.date.getTime() + event.duration * 60 * 60 * 1000);
  const endDateString = formatDate(endDate);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FLL Llamas//Meeting Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@fll-llamas.com`,
    `DTSTART:${startDate}`,
    `DTEND:${endDateString}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');

  return icsContent;
}

export function getMeetingDateTime(meetingDate: Date, startTime?: string, duration?: number): { date: Date; duration: number } {
  const meetingDateTime = new Date(meetingDate);
  
  if (startTime) {
    // Parse startTime in format "HH:MM" (24-hour format)
    const [hours, minutes] = startTime.split(':').map(Number);
    meetingDateTime.setHours(hours, minutes, 0, 0);
  } else {
    // Fallback to day-of-week logic if no startTime provided
    const dayOfWeek = meetingDate.getDay();
    if (dayOfWeek === 0) { // Sunday
      meetingDateTime.setHours(16, 30, 0, 0); // 4:30 PM
    } else if (dayOfWeek === 4) { // Thursday
      meetingDateTime.setHours(17, 0, 0, 0); // 5:00 PM
    } else {
      // Default to Thursday schedule for other days
      meetingDateTime.setHours(17, 0, 0, 0);
    }
  }
  
  // Use provided duration or fallback to day-of-week logic
  const meetingDuration = duration !== undefined ? duration : 
    (meetingDate.getDay() === 0 ? 1.5 : 1.0); // Sunday: 1.5hrs, others: 1hr
  
  return { date: meetingDateTime, duration: meetingDuration };
}

export function createCalendarLink(title: string, date: Date, duration: number, description?: string, location?: string): string {
  const event: CalendarEvent = {
    title,
    date,
    duration,
    description,
    location: location || "Piedmont Makers Club"
  };
  
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}