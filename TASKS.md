# TASKS - Iteration 5: Daemon Mode

## Overview

**Iteration Goal:** Users can run clarvis as a background daemon that eliminates the 27-second lspeak import delay  
**Total Features:** 4  
**Total Tasks:** 16  
**Current Status:** 0/16 tasks complete

## Task Completion Tracking

### Feature 1: Daemon Server with Unix Socket

- [ ] 1.1
- [ ] 1.2
- [ ] 1.3
- [ ] 1.4
- [ ] 1.5
- [ ] 1.6
- [ ] 1.7
- [ ] 1.8

### Feature 2: Hook Client Socket Support

- [ ] 2.1
- [ ] 2.2
- [ ] 2.3

### Feature 3: Daemon CLI Command

- [ ] 3.1
- [ ] 3.2

### Feature 4: Service Documentation

- [ ] 4.1
- [ ] 4.2
- [ ] 4.3

## Detailed Task Breakdown

## Feature 1: Daemon Server with Unix Socket

### 1.1: Create ClarvisDaemon class with __init__ method

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** ClarvisDaemon class that stores socket path and pre-imports lspeak
- **Demo:** `uv run python -c "from clarvis.daemon import ClarvisDaemon; d = ClarvisDaemon(); print(d.socket_path)"`
- **Dependencies:** None
- **Notes:** Set socket_path to Path("/tmp/clarvis.sock"), import lspeak.speak in __init__

### 1.2: Add daemon initialization for components

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** Daemon __init__ loads JarvisLLM and JarvisSpeaker with API keys from environment
- **Demo:** `uv run python -c "from clarvis.daemon import ClarvisDaemon; d = ClarvisDaemon(); print(d.llm, d.speaker)"`
- **Dependencies:** 1.1
- **Notes:** Get OPENAI_API_KEY and ELEVENLABS_API_KEY from os.getenv(), handle missing keys gracefully

### 1.3: Create handle_client async method skeleton

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** Async method that accepts StreamReader/StreamWriter parameters
- **Demo:** `uv run python -c "import inspect; from clarvis.daemon import ClarvisDaemon; print(inspect.iscoroutinefunction(ClarvisDaemon.handle_client))"`
- **Dependencies:** 1.1
- **Notes:** Method signature: async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter)

### 1.4: Add JSON reading from socket in handle_client

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** handle_client reads one line from socket and parses as JSON
- **Demo:** `uv run python -m pytest tests/unit/test_daemon.py::test_handle_client_reads_json -xvs`
- **Dependencies:** 1.3
- **Notes:** Use await reader.readline(), decode and json.loads(), handle JSON errors

### 1.5: Add process_hook async method

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** Async method that processes hook using existing clarvis pipeline
- **Demo:** `uv run python -m pytest tests/unit/test_daemon.py::test_process_hook_calls_pipeline -xvs`
- **Dependencies:** 1.2, 1.4
- **Notes:** Parse hook, extract context, read transcript, classify, summarize with LLM, speak with TTS

### 1.6: Add socket response in handle_client

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** handle_client sends "ok\n" response and closes connection
- **Demo:** `uv run python -m pytest tests/unit/test_daemon.py::test_handle_client_sends_ok -xvs`
- **Dependencies:** 1.4, 1.5
- **Notes:** writer.write(b"ok\n"), await writer.drain(), writer.close()

### 1.7: Create run async method with socket server

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** Async run method that starts Unix socket server at /tmp/clarvis.sock
- **Demo:** `uv run python -m pytest tests/unit/test_daemon.py::test_run_creates_socket -xvs`
- **Dependencies:** 1.3
- **Notes:** Use asyncio.start_unix_server(), unlink old socket if exists, serve_forever()

### 1.8: Add error handling and logging to daemon

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/daemon.py`
- **Deliverable:** Try-except blocks in handle_client and process_hook with proper logging
- **Demo:** `uv run python -m pytest tests/unit/test_daemon.py::test_daemon_handles_errors -xvs`
- **Dependencies:** 1.5, 1.6
- **Notes:** Log errors but keep daemon running, use existing logger from clarvis.logger

## Feature 2: Hook Client Socket Support

### 2.1: Create send_to_daemon function

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/cli.py`
- **Deliverable:** Function that checks if socket exists and returns bool
- **Demo:** `uv run python -c "from clarvis.cli import send_to_daemon; print(send_to_daemon({'test': 'data'}))"`
- **Dependencies:** None
- **Notes:** Check Path("/tmp/clarvis.sock").exists(), return False if not found

### 2.2: Add socket connection logic to send_to_daemon

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/cli.py`
- **Deliverable:** send_to_daemon connects to socket and sends JSON with newline
- **Demo:** `uv run python -m pytest tests/unit/test_cli.py::test_send_to_daemon_connects -xvs`
- **Dependencies:** 2.1
- **Notes:** socket.AF_UNIX, socket.SOCK_STREAM, send JSON + b"\n", recv response, return True if "ok"

### 2.3: Integrate daemon fallback in main command

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/cli.py`
- **Deliverable:** Main command tries send_to_daemon first, falls back to direct processing
- **Demo:** `echo '{"session_id":"test","transcript_path":"/tmp/test.jsonl","cwd":"/tmp"}' | uv run python -m clarvis`
- **Dependencies:** 2.2
- **Notes:** After parsing hook_data, if send_to_daemon(hook_data.dict()): return, else continue existing logic

## Feature 3: Daemon CLI Command

### 3.1: Add daemon command to Typer app

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/cli.py`
- **Deliverable:** New @app.command() function named daemon that starts the daemon
- **Demo:** `uv run python -m clarvis daemon --help`
- **Dependencies:** None
- **Notes:** @app.command() def daemon(): """Run clarvis daemon (stays in foreground)."""

### 3.2: Implement daemon command with asyncio.run

- **Status:** 📋 Not Started
- **Files:** `src/clarvis/cli.py`
- **Deliverable:** daemon command creates ClarvisDaemon and runs forever
- **Demo:** `timeout 2 uv run python -m clarvis daemon; echo "Exit code: $?"`
- **Dependencies:** 3.1, 1.7
- **Notes:** Log startup messages, create ClarvisDaemon(), asyncio.run(daemon.run()), handle KeyboardInterrupt

## Feature 4: Service Documentation

### 4.1: Add daemon mode section to README

- **Status:** 📋 Not Started
- **Files:** `README.md`
- **Deliverable:** Section explaining daemon mode and its benefits (no 27-second delay)
- **Demo:** `grep -A 5 "## Daemon Mode" README.md`
- **Dependencies:** None
- **Notes:** Explain purpose, benefits, basic usage: clarvis daemon

### 4.2: Add systemd service example to README

- **Status:** 📋 Not Started
- **Files:** `README.md`
- **Deliverable:** Complete systemd service configuration in markdown code block
- **Demo:** `grep -A 15 "systemd" README.md | grep ExecStart`
- **Dependencies:** 4.1
- **Notes:** [Unit], [Service] with Type=simple, ExecStart=/usr/local/bin/clarvis daemon, [Install]

### 4.3: Add launchd plist example to README

- **Status:** 📋 Not Started
- **Files:** `README.md`
- **Deliverable:** Complete launchd plist configuration in markdown code block
- **Demo:** `grep -A 20 "launchd" README.md | grep ProgramArguments`
- **Dependencies:** 4.1
- **Notes:** XML plist with Label, ProgramArguments, EnvironmentVariables, RunAtLoad, KeepAlive

## Implementation Order

Suggested sequence based on dependencies:

1. Start with: 1.1 (ClarvisDaemon class)
2. Then: 1.2, 1.3, 2.1, 3.1, 4.1 (no dependencies) 
3. Then: 1.4, 1.5, 1.7 (core daemon logic)
4. Then: 1.6, 1.8 (complete daemon)
5. Then: 2.2, 3.2 (integrate with CLI)
6. Finally: 2.3, 4.2, 4.3 (finish integration and docs)

## Task Status Legend

- 📋 Not Started
- 🔄 In Progress
- ✅ Complete
- ❌ Blocked
- 🔍 In Review

## Notes

- All tasks designed to be 20-50 lines of focused code
- Each task has single responsibility
- Dependencies minimal and clear
- No test-only tasks (tests included in implementation)