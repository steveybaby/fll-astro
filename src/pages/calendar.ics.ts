import { getCollection } from 'astro:content';
import { getMeetingDateTime } from '../utils/calendar.ts';

export async function GET() {
  try {
    const meetings = await getCollection('meetings');
    
    // Generate events for all meetings
    const events = meetings.map(meeting => {
      const { date: meetingDateTime, duration } = getMeetingDateTime(
        meeting.data.date,
        meeting.data.startTime,
        meeting.data.duration
      );
      const endDateTime = new Date(meetingDateTime.getTime() + duration * 60 * 60 * 1000);
      
      const formatDate = (date: Date): string => {
        // Convert UTC date to Pacific timezone display
        const pacificTimeString = date.toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Parse the localized string to get Pacific timezone values
        // Format will be: "MM/DD/YYYY, HH:MM:SS"
        const [datePart, timePart] = pacificTimeString.split(', ');
        const [month, day, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        
        return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}T${hours}${minutes}${seconds}`;
      };
      
      const uid = `meeting-${meeting.slug}@fll-llamas.com`;
      const meetingUrl = `${import.meta.env.SITE}/meetings/${meeting.slug}/`;
      const summary = meeting.data.title;
      const description = meeting.data.agenda 
        ? `Looting Llamas Team Meeting\\n\\nAgenda:\\n${meeting.data.agenda.map(item => `• ${item}`).join('\\n')}\\n\\nView full meeting details and notes: ${meetingUrl}\\n\\nAll team meetings: ${import.meta.env.SITE}/meeting-plans/`
        : `Looting Llamas Team Meeting\\n\\nView full meeting details and notes: ${meetingUrl}\\n\\nAll team meetings: ${import.meta.env.SITE}/meeting-plans/`;
      const location = meeting.data.location || 'Piedmont Makers Club';
      
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;TZID=America/Los_Angeles:${formatDate(meetingDateTime)}`,
        `DTEND;TZID=America/Los_Angeles:${formatDate(endDateTime)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'END:VEVENT'
      ].join('\r\n');
    });
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Looting Llamas//Team Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Looting Llamas Team Meetings',
      'X-WR-CALDESC:FIRST Lego League team meeting schedule',
      'X-WR-TIMEZONE:America/Los_Angeles',
      'BEGIN:VTIMEZONE',
      'TZID:America/Los_Angeles',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:-0800',
      'TZOFFSETTO:-0700',
      'TZNAME:PDT',
      'DTSTART:20070311T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:-0700',
      'TZOFFSETTO:-0800',
      'TZNAME:PST',
      'DTSTART:20071104T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
      'END:STANDARD',
      'END:VTIMEZONE',
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');
    
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="fll-llamas-calendar.ics"',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating calendar:', error);
    return new Response('Error generating calendar', { status: 500 });
  }
}
