import express from "express";
import cors from "cors";
import {MongoClient} from "mongodb";
import dotenv from "dotenv";

//configs
const server = express();
dotenv.config();
server.use(cors());
server.use(json());
let db;

const mongoClient = new MongoClient(process.env.MONGO_URI);

mongoClient.connect().then(() => {
    db = mongoClient.db("chatUol");
}).catch((err) => console.log(err));

server.listen("5000", () => {
    console.log("Rodando em http://localhost:5000");
  })