import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
//import Joi from "joi";

//configs
const server = express();
dotenv.config();
server.use(cors());
server.use(express.json());
let db;

const mongoClient = new MongoClient(process.env.MONGO_URI);

await mongoClient.connect();
db = mongoClient.db("batePapoUol");

server.post("/participants", async (req, res) => {
  /*  const schema = Joi.object({
        name: Joi.string().required(),
    }) */
  const { name } = req.body;
  if (!name) {
    res.sendStatus(422);
    return;
  }
  try {
    const user = await db.collection("participants").findOne({ name });

    if (user !== null) {
      res.sendStatus(409);
      return;
    }
    await db.collection("participants").insertOne({
      name,
      lastStatus: Date.now(),
    });
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});

server.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (err) {
    console.log(err);
  }
});

server.post("/messages", async (req, res) => {
  /*  const schema = Joi.object({
        name: Joi.string().required(),
    }) */
  const { to, text, type } = req.body;
  const from = req.headers.user;
  try {
    const user = await db.collection("participants").findOne({ name: from });

    if (user === null) {
      res.sendStatus(422);
      return;
    }
    await db.collection("messages").insertOne({
      from,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});

server.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const user = req.headers.user;
  try {
    const messages = await db.collection("messages").find().toArray();
    const filteredMessages = messages.filter(
      (message) =>
        message.type === "message" ||
        (message.type === "private_message" &&
          (message.to === user || message.from === user))
    );
    if (limit) res.send(filteredMessages.slice(-limit));
    else res.send(filteredMessages);
  } catch (err) {
    console.log(err);
  }
});

server.listen("5000", () => {
  console.log("Running in http://localhost:5000");
});
