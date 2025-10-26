require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ------------------- MySQL (TiDB) Connection -------------------
let pool;

async function initDB() {
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        ca: fs.readFileSync(process.env.DB_SSL_CA),
      },
    });

    console.log("✅ Database connected successfully!");

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        priority ENUM('High','Medium','Low') DEFAULT 'Low',
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("🗂️ Table check complete (tasks)");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  }
}

// ------------------- API Routes -------------------

// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Add new task
app.post("/api/tasks", async (req, res) => {
  try {
    const { name, priority } = req.body;
    const [result] = await pool.query(
      "INSERT INTO tasks (name, priority) VALUES (?, ?)",
      [name, priority]
    );
    const [task] = await pool.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);
    res.json(task[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// Toggle completion
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE tasks SET completed = NOT completed WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete one task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM tasks WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Delete all tasks
app.delete("/api/tasks", async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks");
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete all tasks" });
  }
});

// ------------------- Serve Frontend Pages -------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/home", (req, res) => res.sendFile(path.join(__dirname, "public", "home.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

// ------------------- Start Server -------------------
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});
