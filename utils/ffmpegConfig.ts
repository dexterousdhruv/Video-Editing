import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

// Set the path to the local ffmpeg binary
const ffmpegPath = path.join(__dirname, "..", "bin", 'ffmpeg.exe');
const ffprobePath = path.join(__dirname, "..", "bin", 'ffprobe.exe');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath)

export default ffmpeg;
