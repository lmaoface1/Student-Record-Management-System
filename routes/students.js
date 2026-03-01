const express = require("express");
const router = express.Router();
const db = require("../config/db");

module.exports = router;

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM students ORDER BY last_name ASC",
    );
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { student_number, first_name, last_name, course, year_level } =
      req.body;

    // Validate - make sure no field is empty
    if (
      !student_number ||
      !first_name ||
      !last_name ||
      !course ||
      !year_level
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const query = `INSERT INTO students (student_number, first_name, last_name, course, year_level)
                   VALUES (?, ?, ?, ?, ?)`;

    const [result] = await db.execute(query, [
      student_number,
      first_name,
      last_name,
      course,
      year_level,
    ]);
    res
      .status(201)
      .json({ success: true, message: "Student added!", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ success: false, message: "Student number already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { student_number, first_name, last_name, course, year_level } =
      req.body;

    if (
      !student_number ||
      !first_name ||
      !last_name ||
      !course ||
      !year_level
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Check if student exists first
    const [existing] = await db.execute(
      "SELECT id FROM students WHERE id = ?",
      [req.params.id],
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const query = `UPDATE students SET student_number=?, first_name=?, last_name=?, course=?, year_level=?
                   WHERE id=?`;
    await db.execute(query, [
      student_number,
      first_name,
      last_name,
      course,
      year_level,
      req.params.id,
    ]);
    res.status(200).json({ success: true, message: "Student updated!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ success: false, message: "Student number already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [existing] = await db.execute(
      "SELECT id FROM students WHERE id = ?",
      [req.params.id],
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    await db.execute("DELETE FROM students WHERE id = ?", [req.params.id]);
    res.status(200).json({ success: true, message: "Student deleted!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/search/:keyword", async (req, res) => {
  try {
    const keyword = `%${req.params.keyword}%`;
    const query = `SELECT * FROM students 
                   WHERE last_name LIKE ? OR first_name LIKE ? OR student_number LIKE ?
                   ORDER BY last_name ASC`;
    const [rows] = await db.execute(query, [keyword, keyword, keyword]);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
