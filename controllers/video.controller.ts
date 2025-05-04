import { NextFunction, Request, Response } from "express";
import { prismaDb } from "../connect/db";
import { errorHandler } from "../utils/error";
import fs from "fs";
import path from "path";
import ffmpeg from "../utils/ffmpegConfig";
import {
  addSubtitlesToVideo,
  convertToDuration,
  generateTimedSrtFile,
} from "../utils/helpers";
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

    res.status(200).json({ message: "success", video });
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
    const videoPath = req.file.path;
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
    const outputPath = path.join(outputDir, trimmedFileName);

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
  } catch (e) {
    console.error("Error in trim video controller:", e);
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
    const outputPath = path.join(outputDir, outputFileName);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate .srt subtitle file
    const subtitleFilePath = path.resolve(`temp-${id}.srt`);
    generateTimedSrtFile(text, startTime, endTime, subtitleFilePath);

    await addSubtitlesToVideo(inputPath, subtitleFilePath, outputPath);
    fs.unlinkSync(subtitleFilePath);

    await prismaDb.video.update({
      where: { id },
      data: { subtitledPath: outputPath },
    });

    res.status(200).json({
      message: "Subtitles added",
      subtitledPath: outputPath,
    });
  } catch (e) {
    console.log("Error in add subtitles controller:", e);
    return next(errorHandler(500, "Server error, Please try again later!"));
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
    const outputPath = path.join(outputDir, outputFileName);

    ffmpeg(inputPath)
      .output(outputPath)
      .outputOptions(["-c:v copy", "-c:a copy", "-c:s mov_text"])

      .on("start", (cmdLine) => {
        console.log("FFmpeg started with command:", cmdLine);
      })
      .on("end", async () => {

        const filesToDelete = [video.subtitledPath, video.trimmedPath].filter(
          Boolean
        );
        for (const file of filesToDelete) {
          const resolvedPath = path.resolve(file!);
          if (fs.existsSync(resolvedPath)) {
            try {
              fs.unlinkSync(resolvedPath);
              console.log(`Deleted intermediate file: ${resolvedPath}`);
            } catch (err) {
              console.warn(
                `Failed to delete intermediate file: ${resolvedPath}`,
                err
              );
            }
          }
        }

        const updatedVideo = await prismaDb.video.update({
          where: { id },
          data: {
            finalPath: outputPath,
            status: "rendered",
            trimmedPath: null,
            subtitledPath: null,
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
    console.error("Error in render final video controller:", e);
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

    if (!video) {
      return next(errorHandler(404, "File not found!"));
    }

    if (!video.finalPath) {
      return next(errorHandler(404, "Video still not rendered!"));
    }

    const finalPath = video.finalPath;

    if (!fs.existsSync(finalPath)) {
      return next(errorHandler(404, "Rendered file does not exist on server"));
    }

    res.status(200).json({
      message: "success",
      downloadUrl: `${process.env.BASE_URL}/uploads/${path.basename(
        finalPath
      )}`,
    });
  } catch (err) {
    console.error("Error in download final video:", err);
    return next(errorHandler(500, "Server error. Please try again later."));
  }
};
