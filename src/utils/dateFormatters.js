export function toTimeAgoString(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past; // Difference in milliseconds

  // Calculate time components
  const seconds = Math.floor(diffMs / 1000) % 60;
  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Construct the human-readable time difference
  const parts = [];
  if (days > 0) {
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  } else {
    if (hours > 0) {
      parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    } else {
      if (minutes > 0) {
        parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
      } else {
        if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
      }
    }
  }

  // Join parts with commas and add "ago"
  return parts.length > 0 ? parts.join(' ') + ' ago' : 'just now';
}

export function formatDateForHover(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-AU", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function twoMonthsAgoISOString() {
  const now = new Date();
  now.setMonth(now.getMonth() - 2);
  return now.toISOString();
}
