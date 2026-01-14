import express, { Request, Response } from "express";
import path from "path";
import bcrypt from "bcrypt";
import { openDb, run, get } from "./db";

type UserRow = { username: string; password_hash: string };
type AuthStateRow = { username: string; failed_attempts: number; locked_until: string | null };

const app = express();
const DEFAULT_PORT = 8080;
const PORT = readPort();

const MAX_FAILED = 5;
const LOCK_MINUTES = 5;

/**
 * @brief Read listening port from environment with safe fallback.
 * @return Port number for the HTTP server.
 */
function readPort(): number {
    const raw = process.env.APP_PORT ?? process.env.PORT;
    if (!raw) return DEFAULT_PORT;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) return DEFAULT_PORT;
    return Math.trunc(parsed);
}

/**
 * @brief Add minutes to the current time and return ISO string.
 * @param minutes Number of minutes to add.
 * @return ISO 8601 timestamp.
 */
function addMinutesIso(minutes: number): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
}

// body parsers
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

// --- DB init ---
const db = openDb("./data/auth.db");

/**
 * @brief Initialize database schema and seed default admin user.
 */
async function initDb(): Promise<void> {
    await run(
        db,
        `CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL
    );`
    );
    await run(
        db,
        `CREATE TABLE IF NOT EXISTS auth_state (
    username TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT NULL,
    FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
  );`
    );

    // seed admin/admin если нет
    const admin = await get<UserRow>(db, "SELECT username, password_hash FROM users WHERE username = ?", ["admin"]);
    if (!admin) {
        const hash = await bcrypt.hash("admin", 10);
        await run(db, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["admin", hash]);
        await run(db, "INSERT INTO auth_state (username, failed_attempts, locked_until) VALUES (?, 0, NULL)", ["admin"]);
        console.log("[seed] created user admin/admin (hashed)");
    } else {
        await run(
            db,
            "INSERT OR IGNORE INTO auth_state (username, failed_attempts, locked_until) VALUES (?, 0, NULL)",
            ["admin"]
        );
    }
}

// --- UI files ---
app.get("/", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/app.js", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", "app.js"));
});

app.get("/register", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", "register.html"));
});

app.get("/register.js", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", "register.js"));
});

/**
 * @brief Handle login requests and return authentication result.
 */
app.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({ ok: false, message: "Некорректный ввод." });
    }

    const u = username.trim();

    try {
        // 1) пользователь существует?
        const user = await get<UserRow>(db, "SELECT username, password_hash FROM users WHERE username = ?", [u]);
        if (!user) {
            return res.status(401).json({ ok: false, message: "Отказ в доступе" });
        }

        // 2) состояние блокировки/попыток
        await run(
            db,
            "INSERT OR IGNORE INTO auth_state (username, failed_attempts, locked_until) VALUES (?, 0, NULL)",
            [u]
        );

        const state = await get<AuthStateRow>(
            db,
            "SELECT username, failed_attempts, locked_until FROM auth_state WHERE username = ?",
            [u]
        );

        if (!state) {
            return res.status(500).json({ ok: false, message: "Ошибка состояния аутентификации" });
        }

        // 3) если заблокирован — отказ
        if (state.locked_until) {
            const lockedUntilMs = new Date(state.locked_until).getTime();
            if (Date.now() < lockedUntilMs) {
                return res.status(403).json({
                    ok: false,
                    message: `Пользователь заблокирован до ${state.locked_until}.`
                });
            } else {
                // блокировка истекла — сбросим
                await run(db, "UPDATE auth_state SET failed_attempts = 0, locked_until = NULL WHERE username = ?", [u]);
            }
        }

        // 4) проверка пароля
        const ok = await bcrypt.compare(password, user.password_hash);

        if (ok) {
            // успешный вход — сброс счётчика
            await run(db, "UPDATE auth_state SET failed_attempts = 0, locked_until = NULL WHERE username = ?", [u]);
            return res.status(200).json({ ok: true, message: "Доступ предоставлен" });
        }

        // 5) неверный пароль — увеличиваем счётчик
        const newFailed = state.failed_attempts + 1;

        if (newFailed >= MAX_FAILED) {
            const until = addMinutesIso(LOCK_MINUTES);
            await run(
                db,
                "UPDATE auth_state SET failed_attempts = ?, locked_until = ? WHERE username = ?",
                [newFailed, until, u]
            );
            return res.status(403).json({
                ok: false,
                message: `Слишком много попыток. Блокировка до ${until}.`
            });
        } else {
            await run(db, "UPDATE auth_state SET failed_attempts = ? WHERE username = ?", [newFailed, u]);
            return res.status(401).json({
                ok: false,
                message: `Отказ в доступе. Осталось попыток: ${MAX_FAILED - newFailed}.`
            });
        }
    } catch {
        return res.status(500).json({ ok: false, message: "Ошибка БД/сервера" });
    }
});

/**
 * @brief Validate user input for registration.
 * @param username Requested username.
 * @param password Requested password.
 * @return Error message or null when input is valid.
 */
function validateNewUser(username: string, password: string): string | null {
    const u = username.trim();
    if (u.length < 3 || u.length > 32) return "Логин должен быть длиной 3–32 символа.";
    if (!/^[a-zA-Z0-9._-]+$/.test(u)) return "Логин содержит недопустимые символы.";
    if (password.length < 6 || password.length > 72) return "Пароль должен быть длиной 6–72 символа.";
    return null;
}

/**
 * @brief Handle registration requests for new users.
 */
app.post("/register", async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({ ok: false, message: "Некорректный ввод." });
    }

    const err = validateNewUser(username, password);
    if (err) return res.status(400).json({ ok: false, message: err });

    const u = username.trim();

    try {
        // 1) проверяем, что пользователя нет
        const existing = await get<UserRow>(db, "SELECT username, password_hash FROM users WHERE username = ?", [u]);
        if (existing) {
            return res.status(409).json({ ok: false, message: "Такой логин уже существует." });
        }

        // 2) создаём пользователя
        const hash = await bcrypt.hash(password, 10);
        await run(db, "INSERT INTO users (username, password_hash) VALUES (?, ?)", [u, hash]);

        // 3) создаём состояние аутентификации
        await run(
            db,
            "INSERT INTO auth_state (username, failed_attempts, locked_until) VALUES (?, 0, NULL)",
            [u]
        );

        return res.status(201).json({ ok: true, message: "Пользователь создан. Теперь можно войти." });
    } catch {
        return res.status(500).json({ ok: false, message: "Ошибка БД/сервера" });
    }
});

/**
 * @brief Start HTTP server after DB initialization.
 */
async function main(): Promise<void> {
    await initDb();

    app.listen(PORT, () => {
        console.log(`Listening on http://127.0.0.1:${PORT}`);
        console.log("Seed user: admin/admin");
    });
}

main().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});
