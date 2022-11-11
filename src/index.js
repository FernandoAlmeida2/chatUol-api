import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";

// schemas

const userSchema = Joi.object({
  name: Joi.string().required(),
});

const messageSchema = Joi.object({
  to: Joi.string().required(),
  text: Joi.string().required(),
  type: Joi.string().valid("message", "private_message").required(),
});

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
  const body = req.body;
  const validation = userSchema.validate(body, { abortEarly: false });
  if (validation.error) {
    const errorList = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errorList);
    return;
  }
  try {
    const user = await db.collection("participants").findOne(body);

    if (user !== null) {
      res.sendStatus(409);
      return;
    }
    await db.collection("participants").insertOne({
      name: body.name,
      lastStatus: Date.now(),
    });
    await db.collection("messages").insertOne({
      from: body.name,
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
  const body = req.body;
  const from = req.headers.user;
  const validation = messageSchema.validate(body, { abortEarly: false });

  if (validation.error) {
    const errorList = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errorList);
    return;
  }
  try {
    const activeUser = await db
      .collection("participants")
      .findOne({ name: from });

    if (activeUser === null) {
      res.status(422).send(`${from} is offline`);
      return;
    }
    await db.collection("messages").insertOne({
      from,
      ...body,
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
    const activeUser = await db
      .collection("participants")
      .findOne({ name: user });

    if (activeUser === null) {
      res.status(422).send(`${user} is offline`);
      return;
    }
    const filteredMessages = messages.filter(
      (message) =>
        message.type === "message" ||
        message.to === "Todos" ||
        (message.type === "private_message" &&
          (message.to === user || message.from === user))
    );
    if (limit) res.send(filteredMessages.slice(-limit));
    else res.send(filteredMessages);
  } catch (err) {
    console.log(err);
  }
});

server.post("/status", async (req, res) => {
  const name = req.headers.user;
  try {
    const activeUser = await db.collection("participants").findOne({ name });

    if (activeUser === null) {
      res.sendStatus(404);
      return;
    }
    await db
      .collection("participants")
      .updateOne({ name }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

server.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
  const user = req.headers.user;
  const id = req.params.ID_DA_MENSAGEM;
  const o_id = new ObjectId(id);
  try {
    const message = await db.collection("messages").findOne({ _id: o_id });
    if (message === null) {
      res.sendStatus(404);
      return;
    }
    if (message.from !== user) {
      res.sendStatus(401);
      return;
    }
    await db.collection("messages").deleteOne({ _id: o_id });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

server.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
  const from = req.headers.user;
  const body = req.body;
  const id = req.params.ID_DA_MENSAGEM;
  const validation = messageSchema.validate(body, { abortEarly: false });

  if (validation.error) {
    const errorList = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errorList);
    return;
  }
  try {
    const o_id = new ObjectId(id);
    const message = await db.collection("messages").findOne({ _id: o_id });
    if (message === null) {
      res.sendStatus(404);
      return;
    }
    if (message.from !== from) {
      res.sendStatus(401);
      return;
    }
    await db.collection("messages").updateOne({ _id: o_id }, { $set: body });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

//autoremove inactive users
setInterval(async () => {
  try {
    const users = await db.collection("participants").find().toArray();
    users.forEach(async (user) => {
      if (Date.now() - user.lastStatus > 10000) {
        await db.collection("participants").deleteOne({ _id: user._id });
        await db.collection("messages").insertOne({
          from: user.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        });
      }
    });
  } catch (err) {
    console.log(err);
  }
}, 15000);

server.listen("5000", () => {
  console.log("Running in http://localhost:5000");
});
