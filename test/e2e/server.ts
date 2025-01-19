import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 4000;

// Middleware to verify the access token
const verifyToken = (req: any, res: any, next: any ) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.decode(token); // Verify token signature if needed
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded; // Attach decoded token to request
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Protected resource route
app.get("/protected-resource", verifyToken, (req, res) => {
  res.status(200).json({
    message: "Access granted to protected resource.",
    user: req.user,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
