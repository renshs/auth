# Linux Authentication App (Debian 12)

Minimal authentication app built with Node.js, Express, SQLite, and bcrypt.

## Requirements
- Debian 12
- `nodejs` and `npm`
- Build tools for native modules (bcrypt): `build-essential` and `python3`
- `doxygen` (for documentation)

Example installation:

```bash
sudo apt update
sudo apt install -y nodejs npm build-essential python3 doxygen
```

## Project Structure
- `src/` - TypeScript source code
- `build/` - build output (generated)
- `data/` - SQLite database file
- `index.html`, `app.js` - login UI
- `register.html`, `register.js` - registration UI

## Build
Install dependencies once:

```bash
npm install
```

Release build (default):

```bash
./build.sh
```

Debug build:

```bash
./build.sh debug
```

## Run
```bash
./run.sh
```

Optional environment variables:
- `APP_PORT` - server port (default 8080)
- `BUILD_DIR` - build output directory (default `./build`)

Example:

```bash
APP_PORT=9090 ./run.sh
```

## Usage
- Open `http://127.0.0.1:8080/` in a browser.
- Default user is `admin` / `admin` (created on first start).
- After 5 failed attempts, the account is locked for 5 minutes.

## Doxygen
Generate documentation:

```bash
doxygen Doxyfile
```

Output is created in `docs/doxygen`.
