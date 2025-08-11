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
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      
      const uid = `meeting-${meeting.slug}@fll-llamas.com`;
      const summary = meeting.data.title;
      const description = meeting.data.agenda 
        ? `Agenda:\\n${meeting.data.agenda.map(item => `• ${item}`).join('\\n')}\\n\\nView full details: ${import.meta.env.SITE}/meetings/${meeting.slug}/`
        : `View full details: ${import.meta.env.SITE}/meetings/${meeting.slug}/`;
      const location = meeting.data.location || 'Piedmont Makers Club';
      
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${formatDate(meetingDateTime)}`,
        `DTEND:${formatDate(endDateTime)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        `URL:${import.meta.env.SITE}/meetings/${meeting.slug}/`,
        'END:VEVENT'
      ].join('\r\n');
    });
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FLL Llamas//Team Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:FLL Llamas Team Meetings',
      'X-WR-CALDESC:FIRST Lego League team meeting schedule',
      'X-WR-TIMEZONE:America/New_York',
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