const express = require("express");
const { Engine } = require("node-uci");

const app = express();
app.use(express.json());

let stockfish;

// Initialize Stockfish Engine
const initializeEngine = async () => {
  stockfish = new Engine("stockfish");
  await stockfish.init(); // Initialize the engine
  await stockfish.setoption("Threads", 2); // Set options if needed
  await stockfish.setoption("Hash", 128); // Set options if needed
  await stockfish.setoption("UCI_LimitStrength", true); // Set options if needed
  console.log("Stockfish engine initialized");
};

// Start Stockfish on server start
initializeEngine().catch((err) => {
  console.error("Failed to initialize Stockfish:", err);
});

// API Endpoint to Get Best Move
app.post("/bestmove", async (req, res) => {
  try {
    const { fen, level } = req.body;

    console.log(fen, level);

    if (!fen || !level) {
      return res.status(400).json({ error: "FEN and Level are required" });
    }

    let skillLevel = 0;

    if (level === "easy") {
      skillLevel = 1; // random between 1-3
    } else if (level === "medium") {
      skillLevel = 5; // random between 7-10
    } else if (level === "hard") {
      skillLevel = 10; // random between 12-15
    }
    // Calculate skill level (0-20) based on ELO
    // const skillLevel = Math.min(Math.max(Math.floor((elo - 800) / 200), 0), 20);
    // console.log(skillLevel);
    // await stockfish.setoption("Skill Level", skillLevel);
    await stockfish.setoption("Skill Level", skillLevel);

    // Set the position from the provided FEN
    await stockfish.position(fen);

    // Get the best move with a search time of 1000ms
    const result = await stockfish.go({ depth: skillLevel * 2 });

    // Parse the best move
    if (result.bestmove && result.bestmove !== "(none)") {
      const from = result.bestmove.slice(0, 2);
      const to = result.bestmove.slice(2, 4);
      res.json({ move: { from, to, promotion: result.bestmove.slice(4, 5) } });
    } else {
      res.status(204).json({ error: "Failed to calculate the best move" });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle cleanup on server shutdown
const shutdown = async () => {
  if (stockfish) {
    await stockfish.quit();
    console.log("Stockfish engine stopped");
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start the Express server
const PORT = 3102;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
