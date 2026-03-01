const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const studentRoutes = require("./routes/students");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.use("/api/students", studentRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
