export function formatMeetingTime(startTime?: string, duration?: number): string {
  if (!startTime) {
    return '';
  }
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
  
  const timeString = `${displayHour}${displayMinutes}${period}`;
  
  if (duration) {
    const durationText = duration === 1 ? '1 hour' : `${duration} hours`;
    return `${timeString} (${durationText})`;
  }
  
  return timeString;
}

export function formatMeetingTimeOrTBD(
  startTime?: string,
  duration?: number,
  timeTBD = false
): string {
  if (timeTBD) {
    const durationText = duration === 1 ? '1 hour' : `${duration} hours`;
    return duration ? `Time TBD (${durationText})` : 'Time TBD';
  }
  return formatMeetingTime(startTime, duration);
}