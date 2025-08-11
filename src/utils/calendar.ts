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
  // Get the date string in YYYY-MM-DD format
  const dateStr = meetingDate.toISOString().split('T')[0];
  
  let timeStr: string;
  if (startTime) {
    timeStr = startTime;
  } else {
    // Fallback to day-of-week logic if no startTime provided
    const dayOfWeek = meetingDate.getDay();
    timeStr = dayOfWeek === 0 ? '16:30' : '17:00'; // Sunday: 4:30 PM, others: 5:00 PM
  }
  
  // Create the meeting datetime by combining date and time, treating as Pacific timezone
  // We'll create this as a localized date string that represents Pacific time
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create a new Date object for the specific date
  const meetingDateTime = new Date(meetingDate);
  meetingDateTime.setUTCFullYear(meetingDate.getUTCFullYear(), meetingDate.getUTCMonth(), meetingDate.getUTCDate());
  
  // Set the time in Pacific timezone by calculating the UTC equivalent
  // Pacific is UTC-8 (PST) or UTC-7 (PDT)
  const now = new Date();
  const year = meetingDate.getFullYear();
  
  // Determine if date is in PDT (Daylight Saving Time)
  // DST in US: second Sunday in March to first Sunday in November
  const march2nd = new Date(year, 2, 8); // March 8th
  const march2ndSunday = new Date(march2nd.getTime() + (7 - march2nd.getDay()) * 24 * 60 * 60 * 1000);
  const nov1st = new Date(year, 10, 1); // November 1st
  const nov1stSunday = new Date(nov1st.getTime() + (7 - nov1st.getDay()) % 7 * 24 * 60 * 60 * 1000);
  
  const isDST = meetingDate >= march2ndSunday && meetingDate < nov1stSunday;
  const utcOffset = isDST ? 7 : 8; // PDT is UTC-7, PST is UTC-8
  
  // Set the UTC time that corresponds to the Pacific time
  meetingDateTime.setUTCHours(hours + utcOffset, minutes, 0, 0);
  
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