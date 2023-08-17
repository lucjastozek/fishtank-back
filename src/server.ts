import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";
import * as bcrypt from "bcrypt";

const app = express();

app.use(express.json());
app.use(cors());

dotenv.config();

const PORT_NUMBER = process.env.PORT ?? 4000;
const connectionString = process.env.DATABASE_URL;
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hashedPassword]
    );

    res.status(201).json({ message: "User registered succesfully" });
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ message: "An error occurred" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await client.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (validPassword) {
      res.status(200).json({ message: "Login successful" });
    } else {
      res.status(401).json({ message: "Authentication failed" });
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ message: "An error occurred" });
  }
});

app.get("/", async (req, res) => {
  res.json({ msg: "Hello! There's nothing interesting for GET /" });
});

app.get("/collections", async (req, res) => {
  try {
    const collections = await client.query("select * from collections");
    res.status(200).json({ status: "success", data: { collections } });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.get("/collections/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const collections = await client.query(
      "select * from collections where id = $1",
      [id]
    );
    res.status(200).json({ status: "success", data: { collections } });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.post("/collections", async (req, res) => {
  const { name } = req.body;
  try {
    const createdCollection = await client.query(
      "insert into collections (owner_id, name) values ($1, $2) returning *",
      [1, name]
    );
    res.status(200).json({ status: "success", data: { createdCollection } });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.post("/collections/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { question, answer } = req.body;

  try {
    //For this to be successful, must connect to db
    const deletedCollection = await client.query(
      "insert into flashcards (collection, question, answer) values ($1, $2, $3) returning *",
      [id, question, answer]
    );
    res.status(200).json({ status: "success", data: { deletedCollection } });
  } catch (error) {
    //Recover from error rather than letting system halt
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.delete("/collections/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const deletedCollection = await client.query(
      "delete from collections where id = $1 returning *",
      [id]
    );
    res.status(200).json({ status: "success", data: { deletedCollection } });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.get("/collections/:id/flashcards", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const collection = await client.query(
      "select * from flashcards where collection = $1",
      [id]
    );
    res.status(200).json({ status: "success", data: { collection } });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.put("/collections/:id", async (req, res) => {
  const { name } = req.body;
  const id = req.params.id;
  try {
    const deletedCollection = await client.query(
      "update collections set name = $2 where id = $1 returning *",
      [id, name]
    );
    res.status(200).json({ status: "success", data: { deletedCollection } });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

connectToDBAndStartListening();

async function connectToDBAndStartListening() {
  console.log("Attempting to connect to db");
  await client.connect();
  console.log("Connected to db!");

  const port = PORT_NUMBER;
  app.listen(port, () => {
    console.log(
      `Server started listening for HTTP requests on port ${port}.  Let's go!`
    );
  });
}
