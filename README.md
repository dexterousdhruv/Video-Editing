# Video Editing API

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Setup and Installation](#setup-and-installation)
5. [API Endpoints](#api-endpoints)

## Project Overview
Backend for a Web-based Video Editing Platform 

For: Move 37 Productions

Video Editing Platform backend API server built with Node.js and Express

## Technology Stack


### Backend (server)
- Node.js (Typescript)
- TypeScript for type-safety 
- Multer for file uploads
- Ffmpeg for video operations
- Express.js
- Postgres (Supabase) for database solutions
- Prisma for database connection and raw SQL queries database interaction

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/dexterousdhruv/Video-Editing.git
   cd Video-Editing
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
  - Create a `.env` file

  - For the backend  (Refer to `.env.example`):
     ```
     PORT=3000
     
     DATABASE_URL="" (Replace with Supabase (Postgres) connection string for Prisma)
     BASE_URL=http://localhost:3000 (Replace with hosted backend url)
    

     ```

4. Start the development servers:   
     ```
     npm run dev
     ```


## API Endpoints

### 1. Video Upload Endpoint

* **Endpoint:** `POST /api/videos/upload`
* **Accepts:** 
```
{
  file: <your-video-file>
}
```
* **Stores:** Metadata in the DB (video name, duration, etc.)


### 2. Video Trimming / Cutting

* **Endpoint:** `POST /api/videos/:id/trim`
* **Accepts:** 
```
{
  "start": "hh:mm:ss",
  "end": "hh:mm:ss",
}
```
* **Uses:** FFmpeg to create a trimmed version
* **Action:** Save trimmed video path and update DB

### 3. Add Subtitles

* **Endpoint:** `POST /api/videos/:id/subtitles`
* **Accepts:** 
```
{
  "startTime": "hh:mm:ss",
  "endTime": "hh:mm:ss",
  "text": "Subtitle check!"
}
```
* **Action:** Overlay on video using FFmpeg

### 4. Render Final Video

* **Endpoint:** `POST /api/videos/:id/render`
* **Combines:** All changes into one final video
* **Action:** Saves it and updates status in DB

### 5. Download Final Video

* **Endpoint:** `GET /api/videos/:id/download`
* **Returns:** Final rendered video for download