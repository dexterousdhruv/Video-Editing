import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { addSubtitles, downloadFinalVideo, getVideoInfo, renderFinalVideo, trimVideo, uploadVideo } from '../controllers/video.controller';
import { storage } from '../utils/multerConfig';

const router = express.Router();
const upload = multer({ storage });


router.get('/:id', getVideoInfo)

router.post('/upload', upload.single('file'), uploadVideo)
router.post('/:id/trim', trimVideo)
router.post('/:id/subtitles', addSubtitles)
router.post('/:id/render', renderFinalVideo)
router.get('/:id/download', downloadFinalVideo)



export default router;
