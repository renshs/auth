const express = require("express");
const path = require("path");
import type { Request, Response } from "express";

const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: false }));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (username === "admin" && password === "admin") {
    res.send("Доступ предоставлен");
  } else {
    res.status(401).send("Отказ в доступе");
  }
});

app.listen(PORT, () => {
  console.log(`Listening on http://127.0.0.1:${PORT}`);
});
