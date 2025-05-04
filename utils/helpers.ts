import { spawn } from "child_process";
import fs from "fs";

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


export const formatTime = (time: string ): string | null => {
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


export const addSubtitlesToVideo = (inputVideoPath: string, subtitlePath: string, outputPath: string) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputVideoPath,
      '-i', subtitlePath,
      '-c', 'copy',
      '-c:s', 'mov_text',
      outputPath,
    ]);
    ffmpeg.stdout.on('data', (data: any) => {
      console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data: any) => {
      console.error(`stderr: ${data}`);
    });

    ffmpeg.on('close', (code: any) => {
      if (code === 0) {
        console.log('Subtitles added successfully.');
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });
  });
};


export const generateTimedSrtFile = (
  paragraph: string,
  startTime: string,
  endTime: string,
  filePath: string
) => {
  const sentences = paragraph
    .split(/[.?!]\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  
  const start = parseTime(startTime) 
  const end = parseTime(endTime) 
  const totalDuration = convertToDuration(startTime, endTime) 


  if (sentences.length === 0 || totalDuration <= 0) {
    throw new Error("Invalid input.");
  }

  const interval = Math.floor(totalDuration / sentences.length);

  const srtLines = sentences.map((sentence, index) => {
    const subStart = start + index * interval;
    const subEnd = index === sentences.length - 1 ? end : subStart + interval;
    return `${index + 1}
${formatTime(subStart.toString())} --> ${formatTime(subEnd.toString())}
${sentence}
`;
  });

  fs.writeFileSync(filePath, srtLines.join("\n"), "utf-8");
    console.log(`SRT file written at ${filePath}`);
};



