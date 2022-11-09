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

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db("batePapoUol");
  })
  .catch((err) => console.log(err));

server.post("/participants", (req, res) => {
  /*  const schema = Joi.object({
        name: Joi.string().required(),
    }) */
  const { name } = req.body;
  if (!name) {
    res.sendStatus(422);
    return;
  }
  db.collection("participants")
    .findOne({ name })
    .then((user) => {
      if (user !== null) {
        res.sendStatus(409);
        return;
      }
      db.collection("participants").insertOne({
        name,
        lastStatus: Date.now(),
      });
      db.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
      res.sendStatus(201);
    })
    .catch((err) => console.log(err));
});

server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((participants) => {
      res.send(participants);
    })
    .catch((err) => console.log(err));
});

server.post("/messages", (req, res) => {
  /*  const schema = Joi.object({
        name: Joi.string().required(),
    }) */
  const { to, text, type } = req.body;
  const from = req.headers.user;
  db.collection("participants")
    .findOne({ name: from })
    .then((user) => {
      if (user === null) {
        res.sendStatus(422);
        return;
      }
      db.collection("messages").insertOne({
        from,
        to,
        text,
        type,
        time: dayjs().format("HH:mm:ss"),
      });
      res.sendStatus(201);
    })
    .catch((err) => console.log(err));
});

server.get("/messages", (req, res) => {
  const { limit } = req.query;
  const user = req.headers.user;
  db.collection("messages")
    .find()
    .toArray()
    .then((messages) => {
      const filteredMessages = messages.filter(
        (message) =>
          message.type === "message" ||
          (message.type === "private_message" &&
            (message.to === user || message.from === user))
      );
      if (limit) res.send(filteredMessages.slice(-limit));
      else res.send(filteredMessages);
    })
    .catch((err) => console.log(err));
});

server.listen("5000", () => {
  console.log("Rodando em http://localhost:5000");
});
