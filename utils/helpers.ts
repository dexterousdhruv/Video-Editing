// Helper to calculate duration
export function convertToDuration(start: string, end: string): number {
  const startSec = parseTime(start);
  const endSec = parseTime(end);
  return endSec - startSec;
}

// Converts hh:mm:ss or seconds string to seconds
export function parseTime(timeStr: string): number {
  const parts = timeStr.split(":").map(Number).reverse();

  let seconds = 0;
  if (parts[0]) seconds += parts[0]; // Seconds
  if (parts[1]) seconds += parts[1] * 60; // Minutes
  if (parts[2]) seconds += parts[2] * 3600; // Hours

  return seconds;
}


export function escapeFilePath(filepath: string): string {
  // Replace all backslashes with double backslashes
  filepath = filepath.replace(/\\/g, "\\\\");

  // Replace all colons with backslash followed by a colon
  filepath = filepath.replace(/:/g, "\\:");

  return filepath;
}

export const formatTime = (time: string): string | null => {
  if (!time.includes(":")) {
    return `00:00:${(+time).toFixed(3).replace(".", ",").padStart(6, "0")}`;
  }

  const parts = time.split(":");
  if (parts.length === 2) {
    // mm:ss
    if (parts[0] === "") {
      return `00:00:${(+parts[1])
        .toFixed(3)
        .replace(".", ",")
        .padStart(6, "0")}`;
    }

    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    if (isNaN(minutes) || isNaN(seconds)) return null;
    return `00:${parts[0].padStart(2, "0")}:${seconds
      .toFixed(3)
      .replace(".", ",")
      .padStart(6, "0")}`;
  } else if (parts.length === 3) {
    // hh:mm:ss
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${seconds
      .toFixed(3)
      .replace(".", ",")
      .padStart(6, "0")}`;
  }
  return null;
};
