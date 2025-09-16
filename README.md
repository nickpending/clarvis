# clarvis

<div align="center">
  
  **Jarvis-style voice notifications for Claude Code**
  
  [GitHub](https://github.com/nickpending/clarvis) | [Issues](https://github.com/nickpending/clarvis/issues) | [lspeak](https://github.com/nickpending/lspeak)

  [![Status](https://img.shields.io/badge/Status-Alpha-orange?style=flat)](#status-alpha)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=flat&logo=typescript)](https://typescriptlang.org)
  [![Bun](https://img.shields.io/badge/Bun-1.2+-FBDB78?style=flat&logo=bun)](https://bun.sh)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

**clarvis** gives Claude Code a voice. When your AI pair programmer completes tasks, encounters errors, or needs your attention, you'll hear Jarvis-style notifications through your speakers.

```bash
# Claude Code finishes implementing authentication
"Sir, I have completed project auth. JWT implementation successful."

# Claude encounters an error
"Sir, I have encountered an error with project checkout-flow. Database migration failed."

# Claude needs your decision
"Sir, I need your input on project authentication. Email or SMS for password reset?"
```

## What is clarvis?

clarvis is a TypeScript/Bun hook processor that transforms Claude Code's text updates into concise voice notifications. It's the bridge between your AI assistant and your ears:

- **Processes Claude Code hooks** to capture assistant messages
- **Summarizes with LLMs** to create Jarvis-style updates (1-3 sentences based on mode)
- **Speaks through lspeak** with first-person JARVIS personality ("I have completed...")
- **Configurable per-project** via TOML with mode-based behavior
- **Smart labeling** - "project" for development, "topic" for other modes

Think of it as **ambient awareness for AI pair programming**. You can:
- Work in another window while Claude runs tests
- Get notified when tasks complete or fail
- Hear decisions that need your attention
- Stay in flow without watching the terminal

## Status: Alpha

**This is early software that works but has rough edges.** It's been in daily use for development work, handling Claude Code voice notifications reliably, but expect quirks and configuration challenges.

## Known Issues & Limitations

**Current limitations in v0.1.0:**

- **Configuration complexity** - Requires manual setup of API keys and config.toml
- **Claude instruction required** - Must manually tell Claude to output metadata lines (not automatic)
- **First-run delay** - 27-second delay on first lspeak use while ML models load
- **Multiple dependencies** - Requires Bun, lspeak, OpenAI API key (ElevenLabs optional for better voice)

**What works well:**
- Reliable voice notifications for development workflow
- Multiple TTS providers (ElevenLabs, system TTS)
- Mode-based verbosity control
- Clean error handling with fallback audio

## Installation

### Prerequisites

```bash
# Install Bun (JavaScript runtime)
curl -fsSL https://bun.sh/install | bash

# Install lspeak (TTS engine)
uv tool install git+https://github.com/nickpending/lspeak.git

# Install pnpm (package manager)
npm install -g pnpm
```

### Install clarvis

**Manual Install (Currently Required):**

```bash
# Clone repository
git clone https://github.com/nickpending/clarvis.git
cd clarvis

# Run installer
chmod +x install.sh
./install.sh
```

**Development Install:**

```bash
# Clone and link for development
git clone https://github.com/nickpending/clarvis.git
cd clarvis
pnpm install
bun run build
sudo ln -sf "$(pwd)/dist/index.js" /usr/local/bin/clarvis
```

### Configure Claude Code

Claude Code hooks allow you to run commands when specific events occur. The "Stop" hook triggers when Claude finishes a message, making it perfect for voice notifications.

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "cat | clarvis"
      }]
    }]
  }
}
```

**How it works:**
- `"Stop"` - Triggers when Claude stops speaking (message complete)
- `"matcher": ""` - Empty matcher means it runs on every message
- `"command": "cat | clarvis"` - Pipes the hook data (JSON) to clarvis

**Testing the hook:**
1. Open Claude Code after saving settings.json
2. Ask Claude a simple question
3. You should hear a voice notification when Claude responds

**Temporarily disable voice:**
```bash
# Disable for current terminal session only
export CLARVIS_VOICE=off

# Re-enable by unsetting or opening new terminal
unset CLARVIS_VOICE
```

## Configuration

Create `~/.config/clarvis/config.toml`:

```toml
# Mode definitions - control verbosity
[modes.default]
style = "terse"  # 1 sentence, 5-10 words

[modes.development]
style = "brief"  # 2 short sentences

[modes.writing]
style = "normal"  # 3 natural sentences

[modes.research]
style = "normal"  # 3 natural sentences

[modes.conversation]
style = "normal"  # 3 natural sentences

# LLM provider (for summarization)
[llm]
provider = "openai"  # or "ollama"
model = "gpt-4o-mini"  # or local model
apiKey = "sk-..."  # Required for OpenAI

# JARVIS base instruction (applied to all modes)
base_instruction = """
You are J.A.R.V.I.S., providing status updates about work in progress.

SPEAK AS JARVIS IN FIRST PERSON:
- If you see "Project: api" → "Sir, I have [status] project api" 
- If you see "Topic: documentation" → "Sir, I have [status] the documentation"
- Always use "I" - you are JARVIS doing the work

SPEECH FORMATTING for TTS:
Spell out: API→A P I, JWT→J W T, URL→U R L, HTTP→H T T P
Pronounce: JSON→jason, SQL→sequel, OAuth→oh-auth
Numbers: 8080→eight zero eight zero
"""

[llm.prompts]
terse = "One sentence, 5-10 words maximum. Just the core status. Apply speech formatting."
brief = "EXACTLY 2 short sentences. First: Status in 5-8 words. Second: One key detail in 8-12 words. Apply speech formatting."
normal = "3 sentences that flow naturally. Include status, key details, and outcome/impact. Keep it conversational but concise. Apply speech formatting."

# Voice configuration
[voice]
provider = "elevenlabs"  # or "system" for free TTS
api_key = "sk_..."  # ElevenLabs API key
voice_id = "YOUR_VOICE_ID_HERE"  # Create a JARVIS-style voice in ElevenLabs
cache_threshold = 0.90

# Note: For ElevenLabs, you'll need to:
# 1. Sign up at https://elevenlabs.io/
# 2. Create a new voice (try "British Male" with professional settings)
# 3. Copy the voice ID from the voice settings
# 4. Use "system" provider for free TTS if you don't want ElevenLabs
```

## Quick Start

Once installed and configured:

### Step 1: Configure Claude to Output Metadata

For clarvis to work, Claude needs to output metadata lines that specify the mode and project. Add this instruction to your Claude conversations:

> **Claude, please start each of your responses with a metadata line in this format:**
> `clarvis:[mode:MODE project:PROJECT_NAME]`
>
> **Available modes:**
> - `development` - Brief technical updates (2 sentences)
> - `writing` - Detailed progress for documentation work (3 sentences)
> - `research` - Detailed analysis summaries (3 sentences)
> - `default` - Minimal updates (1 sentence)
>
> **Example:** `clarvis:[mode:development project:auth-system]`

### Step 2: Use Claude Code Normally

1. **Start Claude Code** and work normally
2. **Claude speaks** when tasks complete via clarvis → lspeak
3. **Verbosity is controlled** by the metadata Claude outputs:

```markdown
clarvis:[mode:development project:api]
Let's implement the authentication system...
```

The metadata line controls:
- `mode`: Selects configuration mode and verbosity:
  - `default` → terse (1 sentence, 5-10 words)
  - `development` → brief (2 short sentences) 
  - `writing`/`research`/`conversation` → normal (3 natural sentences)
- `project`: Names the work being done:
  - Development mode: "Sir, I have completed **project api**"
  - Other modes: "Sir, I have finished **the documentation**"

## Voice Personality

clarvis speaks as JARVIS in first person, as if he's your AI assistant doing the work:

- **First-person speech**: "Sir, I have completed..." not "Sir, project is complete"
- **Smart labeling**: Uses "project" for development, natural phrasing for other modes
- **Speech formatting**: Automatically formats technical terms for TTS (API → "A P I", JSON → "jason")
- **Contextual responses**: Different phrasing for errors, completions, questions, and findings

## How It Works

clarvis processes Claude Code hook events through this pipeline:

```
┌─────────────┐     ┌──────────┐     ┌────────────┐
│ Claude Code │────▶│   Hook   │────▶│ Transcript │
│    Event    │     │  Parser  │     │ Extractor  │
└─────────────┘     └──────────┘     └────────────┘
                                            │
                                      Parse Metadata
                                      (mode, project)
                                            │
                                    ┌───────▼────────┐
                                    │  LLM Summary   │
                                    │ (OpenAI/Ollama)│
                                    └───────┬────────┘
                                            │
                                      Jarvis-style
                                       2 sentences
                                            │
                                    ┌───────▼────────┐
                                    │     lspeak     │
                                    │  (TTS + Cache) │
                                    └────────────────┘
                                            │
                                         🔊 Audio
```

### Architecture Components

1. **Hook Parser** - Reads JSON from stdin with timeout protection
2. **Transcript Extractor** - Gets last assistant message from JSONL
3. **Metadata Parser** - Extracts `clarvis:[...]` control data  
4. **LLM Summarizer** - Creates Jarvis-style summaries
5. **Speaker** - Calls lspeak with voice configuration

### Processing Modes

- **silent**: No output at all
- **terse**: 1 sentence summary
- **brief**: 2 sentence summary (default)
- **normal**: 3 sentence paragraph
- **full**: Pass-through without summarization

## Real-World Usage

### Project-Specific Modes

Control verbosity per project type:

```markdown
# Quick bug fix - minimal interruption
clarvis:[mode:development project:bugfix]
Fix the null pointer exception in auth...

# Complex feature - more detail
clarvis:[mode:normal project:payment-system]
Implement Stripe payment integration...

# Writing/docs - full detail
clarvis:[mode:writing project:docs]
Update the API documentation...
```

### Error Notifications

Errors always speak (never silent) using system TTS fallback:

```typescript
// Even if config is broken, you'll hear:
"Sir, processing failed."
```

### Multi-Session Support

Each project/topic identified in first-person updates:
- "Sir, I have completed project **auth**."
- "Sir, I have encountered an error with project **API**."
- "Sir, I need your input on the **architecture** discussion."

## Performance

With Bun runtime and lspeak caching:

- **Startup**: <100ms (20x faster than Python)
- **Hook processing**: <2 seconds total
- **Cached phrases**: Instant via lspeak
- **New phrases**: 1-2 seconds for LLM + TTS

## Requirements

- Bun 1.2+
- Node.js 20+ (for pnpm)
- lspeak installed
- OpenAI API key (or Ollama running)
- ElevenLabs API key (optional, for premium voices)

## Architecture Decisions

**Why TypeScript/Bun?**  
20x faster startup than Python. Critical for <2 second hook processing limit.

**Why metadata in transcript?**  
Claude Code hooks don't pass message metadata. Embedding in message is the only way.

**Why delegate to lspeak?**  
Semantic caching and queue management are complex. lspeak solves this perfectly.

**Why LLM summarization?**  
Claude's responses are too verbose for speech. Jarvis-style summaries are perfect for audio.

## Troubleshooting

**"Sir, processing failed" constantly**
- Check `~/.config/clarvis/config.toml` exists
- Verify LLM provider is accessible
- Check API keys are valid

**No voice output**
- Verify lspeak is installed: `which lspeak`
- Test lspeak directly: `echo "test" | lspeak`
- Check mode isn't set to "silent"

**Slow processing**
- First call loads lspeak models (27 seconds)
- Subsequent calls should be instant
- Check Ollama server if using local LLM

## Roadmap

**v0.2.0** (Next release):
- [ ] Automatic Claude instruction injection (no manual metadata setup)
- [ ] Simplified config with sensible defaults
- [ ] Better error messages with specific workarounds
- [ ] Config validation and helpful setup wizard

**v0.3.0** (Future):
- [ ] Support for different AI assistants beyond Claude Code
- [ ] Improved metadata extraction patterns
- [ ] Voice customization per project/mode

## Contributing

PRs welcome! Core principles:

- Keep it fast - respect the 2-second hook limit
- Configuration over code - everything in TOML
- Delegate complexity - use lspeak for TTS/caching
- Clear errors - always provide voice feedback

## License

MIT - See [LICENSE](LICENSE)

## Credits

Built to give Claude Code a voice through:
- **lspeak** - Semantic caching and TTS orchestration
- **Claude Code** - The AI pair programmer worth talking to
- **Bun** - Blazing fast JavaScript runtime
- **The original Bash prototype** - 300 lines that proved this works