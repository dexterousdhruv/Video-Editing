import { NextFunction, Request, Response } from "express";
import { prismaDb } from "../connect/db";
import { errorHandler } from "../utils/error";
import fs from "fs";
import path from "path";
import ffmpeg from "../utils/ffmpegConfig";
import { convertToDuration, escapeFilePath } from "../utils/helpers";
import { config } from "dotenv";
config();

export const getVideoInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id) return next(errorHandler(404, "Invalid video id!"));

  try {
    const video = await prismaDb.video.findUnique({ where: { id } });
    if (!video) return next(errorHandler(404, "Video not found"));

    res.status(200).json({ message: "Uploaded successfully", video });
  } catch (err) {
    console.error(err);
    return next(errorHandler(500, "Server error, Please try again later!"));
  }
};

export const uploadVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return next(errorHandler(400, "No video uploaded"));
    }

    const videoName = req.file.originalname;
    const videoPath = "./uploads/" + videoName;
    const videoSize = req.file.size;

    if (!fs.existsSync(videoPath)) {
      return next(errorHandler(404, "Uploaded file not found"));
    }

    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err) {
        return next(errorHandler(500, "Error reading video metadata"));
      }
      const duration = metadata.format.duration as number;

      const video = await prismaDb.video.create({
        data: {
          name: videoName,
          path: videoPath,
          duration,
          size: videoSize,
        },
      });

      res.status(200).json({ message: "Uploaded successfully", video });
    });
  } catch (e) {
    console.log("Error in upload video controller:", e);
    return next(errorHandler(500, "Server error, Please try again later!"));
  }
};

export const trimVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { start, end } = req.body;

  if (!start || !end) {
    return next(errorHandler(400, "Start and end timestamps are required"));
  }

  try {
    const video = await prismaDb.video.findUnique({ where: { id } });
    if (!video) return next(errorHandler(404, "Video not found"));

    const inputPath = path.resolve(video.path);
    if (!fs.existsSync(inputPath))
      return next(errorHandler(404, "Video file missing"));

    const trimmedFileName = `trimmed-${Date.now()}-${video.name}`;
    const outputDir = path.resolve("uploads/trimmed");
    const outputPath = path.join("./uploads/trimmed", trimmedFileName);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(convertToDuration(start, end))
      .output(outputPath)
      .on("start", (cmdLine) => {
        console.log("Spawned FFmpeg with command:", cmdLine);
      })
      .on("end", async () => {
        const updatedVideo = await prismaDb.video.update({
          where: { id },
          data: {
            trimmedPath: outputPath,
          },
        });
        res
          .status(200)
          .json({ message: "Video trimmed successfully", video: updatedVideo });
      })
      .on("error", (err) => {
        console.error("Error trimming video:", err);
        return next(errorHandler(500, "Server error, Please try again later!"));
      })
      .run();
  } catch (err) {
    console.error(err);
    return next(errorHandler(500, "Server error"));
  }
};

export const addSubtitles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { text, startTime, endTime } = req.body;

  if (!text || !startTime || !endTime) {
    return next(
      errorHandler(400, "Subtitle text, startTime and endTime are required")
    );
  }

  try {
    const video = await prismaDb.video.findUnique({ where: { id } });
    if (!video) return next(errorHandler(404, "Video not found"));

    const inputPath = video.trimmedPath || video.path;
    const outputFileName = `subtitled-${Date.now()}-${video.name}`;
    const outputDir = path.resolve("uploads/subtitled");
    const outputPath = path.join("./uploads/subtitled", outputFileName);
    const ffmpegOutputPath = escapeFilePath(outputPath);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate .srt subtitle file
    const subtitleFilePath = path.resolve(`temp-${id}.srt`);
    const ffmpegSubtitlePath = escapeFilePath(subtitleFilePath);
    const subtitleContent = `
      1
     00:00:${startTime},000 --> 00:00:${endTime},000
     ${text}
    `;

    fs.writeFileSync(subtitleFilePath, subtitleContent);

    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("libmp3lame")
      .outputOptions(`-vf "subtitles='${ffmpegSubtitlePath}'"`)
      .output(ffmpegOutputPath)
      .on("start", (cmdLine) => {
        console.log("Spawned FFmpeg with command:", cmdLine);
      })
      .on("end", async () => {
        fs.unlinkSync(subtitleFilePath);
        await prismaDb.video.update({
          where: { id },
          data: { subtitledPath: outputPath },
        });
        return res.status(200).json({
          message: "Subtitles added",
          subtitledPath: outputPath,
        });
      })
      .on("error", (err) => {
        console.log(err);
        fs.unlinkSync(subtitleFilePath);
        return next(errorHandler(500, "Error overlaying subtitles"));
      })
      .run();
  } catch (err) {
    console.log(err);
    return next(errorHandler(500, "Something went wrong"));
  }
};

export const renderFinalVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const video = await prismaDb.video.findUnique({ where: { id } });
    if (!video) {
      return next(errorHandler(404, "Video not found"));
    }

    const inputPath = path.resolve(
      video.subtitledPath || video.trimmedPath || video.path
    );
    if (!fs.existsSync(inputPath)) {
      return next(errorHandler(404, "Input video file does not exist"));
    }

    const outputDir = path.resolve("uploads/final");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFileName = `final-${Date.now()}-${video.name}`;
    const outputPath = path.join("./uploads/final", outputFileName);

    ffmpeg(inputPath)
      .output(outputPath)
      .on("start", (cmdLine) => {
        console.log("FFmpeg started with command:", cmdLine);
      })
      .on("end", async () => {
        const updatedVideo = await prismaDb.video.update({
          where: { id },
          data: {
            finalPath: outputPath,
            status: "rendered",
          },
        });

        return res.status(200).json({
          message: "Final video rendered successfully",
          video: updatedVideo,
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg rendering error:", err);
        return next(errorHandler(500, "Error rendering final video"));
      })
      .run();
  } catch (e) {
    console.error("Error in renderFinalVideo controller:", e);
    return next(errorHandler(500, "Server error, Please try again later!"));
  }
};

export const downloadFinalVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const video = await prismaDb.video.findUnique({ where: { id } });

    if (!video || !video.finalPath) {
      return next(errorHandler(404, "Final rendered video not found"));
    }

    const finalPath = video.finalPath;

    if (!fs.existsSync(finalPath)) {
      return next(errorHandler(404, "Rendered file does not exist on server"));
    }

    res.status(200).json({
      message: "success",
      downloadUrl: `${process.env.BASE_URL}/uploads/final/${path.basename(
        finalPath
      )}`,
    });
  } catch (err) {
    console.error("Error in downloadFinalVideo:", err);
    return next(errorHandler(500, "Server error. Please try again later."));
  }
};
