import { config } from "dotenv";
import express from "express"
const cors = require("cors")
import morgan from "morgan"
import videoRouter from "./routes/video.route";
import { errorResponse } from "./utils/error";

const app = express();
const PORT = process.env.PORT || 3000;
config()

app.use(cors({
  origin: process.env.CLIENT_URL || "*",
}))
app.use(morgan('dev'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
  
app.use('/api/videos', videoRouter);

app.use(errorResponse)


app.listen(PORT, () => {
  console.log(`Yo! Server is running on port ${PORT} `)
}) 

     