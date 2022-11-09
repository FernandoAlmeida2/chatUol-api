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

// test routes
server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((participants) => {
      res.send(participants);
    })
    .catch((err) => console.log(err));
});

server.get("/messages", (req, res) => {
  db.collection("messages")
    .find()
    .toArray()
    .then((messages) => {
      res.send(messages);
    })
    .catch((err) => console.log(err));
});

// end test routes

server.listen("5000", () => {
  console.log("Rodando em http://localhost:5000");
});
