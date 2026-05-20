// Creator auth: bcrypt password hashing + JWT bearer tokens.
import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { one } from "./db/pool.js";

const SECRET = process.env.JWT_SECRET || "dev-inkflow-secret-change-me";
const TOKEN_TTL = "30d";

export function signToken(creator) {
  return jwt.sign({ sub: creator.id, role: creator.role }, SECRET, { expiresIn: TOKEN_TTL });
}

export async function registerCreator({ email, displayName, password }) {
  if (!email || !password || !displayName) throw new Error("email, displayName, password are required");
  if (password.length < 8) throw new Error("password must be at least 8 characters");
  const exists = await one("SELECT id FROM creators WHERE email=$1", [email.toLowerCase()]);
  if (exists) throw new Error("an account with that email already exists");
  const hash = await bcrypt.hash(password, 10);
  const creator = await one(
    `INSERT INTO creators (email, display_name, password_hash)
     VALUES ($1,$2,$3) RETURNING id, email, display_name, role`,
    [email.toLowerCase(), displayName, hash]
  );
  return { creator, token: signToken(creator) };
}

export async function loginCreator({ email, password }) {
  const row = await one("SELECT * FROM creators WHERE email=$1", [(email || "").toLowerCase()]);
  if (!row || !(await bcrypt.compare(password || "", row.password_hash))) {
    throw new Error("invalid email or password");
  }
  const creator = { id: row.id, email: row.email, display_name: row.display_name, role: row.role };
  return { creator, token: signToken(creator) };
}

// Express middleware: require a valid token, attach req.creator.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "not authenticated" });
    const payload = jwt.verify(token, SECRET);
    const creator = await one("SELECT id, email, display_name, role FROM creators WHERE id=$1", [payload.sub]);
    if (!creator) return res.status(401).json({ error: "account not found" });
    req.creator = creator;
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.creator?.role !== "admin") return res.status(403).json({ error: "admin only" });
  next();
}
