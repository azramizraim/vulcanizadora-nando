# Telegram Connector Skill Implementation Plan

> **For OpenCode:** Use this plan to implement the Telegram connector skill.

**Goal:** Create a skill that allows OpenCode to connect with Telegram for receiving and sending messages through a bot.

**Architecture:** 
- FastMCP-based server that exposes Telegram bot functionality
- Webhook handler for receiving messages from Telegram
- Built-in commands for sending messages, creating polls, etc.

**Tech Stack:** 
- FastMCP (Python)
- python-telegram-bot library
- FastAPI for webhook endpoints

---

## Task 1: Create Skill Directory Structure

**Objective:** Create the skill folder with proper structure

**Files:**
- Create: `skills/telegram-connector/SKILL.md`
- Create: `skills/telegram-connector/scripts/server.py`

**Step 1: Create directory**

```bash
mkdir -p skills/telegram-connector/scripts
```

**Step 2: Create SKILL.md**

```markdown
---
name: telegram-connector
description: Connect OpenCode with Telegram bot. Use this skill when the user wants to set up Telegram messaging, create a Telegram bot, send/receive messages via Telegram, or integrate Telegram as a communication channel. Works 100% free via Telegram Bot API.
---

# Telegram Connector Skill

This skill allows connecting OpenCode with Telegram for bot functionality.

## Setup

### 1. Create a Bot
1. Open Telegram and search for @BotFather
2. Send /newbot command
3. Follow instructions to name your bot
4. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Chat ID
1. Add your bot to a chat
2. Send a message to the bot
3. Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find your chat_id in the response

## Available Tools

### send_message
Send a message to a Telegram chat.

**Parameters:**
- chat_id (string): The target chat ID
- text (string): Message text (max 4096 chars)

### send_photo
Send a photo to a Telegram chat.

**Parameters:**
- chat_id (string): The target chat ID
- photo (string): Photo URL or file path
- caption (string, optional): Photo caption

### get_updates
Get recent updates from the bot.

**Parameters:**
- offset (int, optional): Update offset
- limit (int, optional): Number of updates (default 100)

### set_webhook
Set webhook URL for the bot.

**Parameters:**
- url (string): Webhook URL

## Example Usage

```
User: Send "Hello from Telegram!" to my bot
→ Use send_message with chat_id and text
```

## Cost
**100% FREE** - Telegram Bot API is completely free.
```

**Step 3: Commit**

```bash
git add skills/telegram-connector/
git commit -m "feat: add Telegram connector skill structure"
```

---

## Task 2: Create MCP Server Script

**Objective:** Create the FastMCP server with Telegram tools

**Files:**
- Create: `skills/telegram-connector/scripts/server.py`

**Step 1: Write server.py**

```python
#!/usr/bin/env python3
"""Telegram Connector MCP Server"""

from fastmcp import FastMCP
import requests
import os
import json
from typing import Optional

mcp = FastMCP("Telegram Connector")

TELEGRAM_API = "https://api.telegram.org/bot"

def get_token() -> str:
    """Get bot token from environment or config."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set. Set via config or .env file.")
    return token

def get_api_url() -> str:
    """Get Telegram API URL."""
    return f"{TELEGRAM_API}{get_token()}"

@mcp.tool()
def send_message(chat_id: str, text: str) -> dict:
    """Send a message to a Telegram chat."""
    url = f"{get_api_url()}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text
    }
    response = requests.post(url, json=payload)
    return response.json()

@mcp.tool()
def send_photo(chat_id: str, photo: str, caption: Optional[str] = None) -> dict:
    """Send a photo to a Telegram chat."""
    url = f"{get_api_url()}/sendPhoto"
    payload = {
        "chat_id": chat_id,
        "photo": photo
    }
    if caption:
        payload["caption"] = caption
    response = requests.post(url, json=payload)
    return response.json()

@mcp.tool()
def get_updates(offset: int = 0, limit: int = 100) -> dict:
    """Get recent updates from the bot."""
    url = f"{get_api_url()}/getUpdates"
    payload = {
        "offset": offset,
        "limit": limit
    }
    response = requests.post(url, json=payload)
    return response.json()

@mcp.tool()
def set_webhook(url: str) -> dict:
    """Set webhook URL for the bot."""
    api_url = f"{get_api_url()}/setWebhook"
    payload = {"url": url}
    response = requests.post(api_url, json=payload)
    return response.json()

@mcp.tool()
def delete_webhook() -> dict:
    """Delete webhook."""
    url = f"{get_api_url()}/deleteWebhook"
    response = requests.post(url)
    return response.json()

@mcp.tool()
def get_me() -> dict:
    """Get bot information."""
    url = f"{get_api_url()}/getMe"
    response = requests.post(url)
    return response.json()

if __name__ == "__main__":
    # Run with stdin/stdio for MCP
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        mcp.run(transport="stdio")
    else:
        # Default to stdio for Claude Code integration
        mcp.run(transport="stdio")
```

**Step 2: Create requirements.txt**

```bash
echo "fastmcp>=2.0" > skills/telegram-connector/scripts/requirements.txt
```

**Step 3: Commit**

```bash
git add skills/telegram-connector/scripts/server.py skills/telegram-connector/scripts/requirements.txt
git commit -m "feat: add Telegram MCP server script"
```

---

## Task 3: Create Configuration Helper

**Objective:** Help users configure their bot token

**Files:**
- Modify: `skills/telegram-connector/SKILL.md`

**Step 1: Add configuration section**

```markdown
## Configuration

### Environment Variables

Set in your shell or `.env`:

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
```

### Or via config file

Create `~/.opencode/telegram.env`:

```
TELEGRAM_BOT_TOKEN=your-bot-token-here
```

Then load in your shell:

```bash
source ~/.opencode/telegram.env
```

## Testing the Connection

1. Run: `python skills/telegram-connector/scripts/server.py run`
2. Test: Use get_me tool to verify connection
3. Should return your bot info
```

**Step 2: Commit**

```bash
git commit -m "docs: add configuration section to Telegram skill"
```

---

## Task 4: Create Quick Start Guide

**Objective:** Provide step-by-step setup instructions

**Files:**
- Modify: `skills/telegram-connector/SKILL.md`

**Step 1: Add quick start**

```markdown
## Quick Start

### Step 1: Create Bot
```
1. Open Telegram → @BotFather
2. /newbot
3. Name: "My Assistant"
4. Username: myassistant_bot (must be unique)
5. Copy token
```

### Step 2: Get Your Chat ID
```
1. Start chat with your bot
2. Send any message
3. Open: https://api.telegram.org/bot<TOKEN>/getUpdates
4. Find "chat":{"id":123456789}
5. Copy the id (your chat_id)
```

### Step 3: Configure OpenCode
```bash
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGHI..."
```

### Step 4: Test
```
→ Use send_message tool
→ Parameters: chat_id="123456789", text="Hello!"
→ Message should appear in Telegram
```
```

**Step 2: Commit**

```bash
git commit -m "docs: add quick start guide to Telegram skill"
```

---

## Verification

Run these commands to verify:

```bash
# 1. Test server starts
python skills/telegram-connector/scripts/server.py run

# 2. Test get_me (should return bot info)
# Use the MCP tool in OpenCode

# 3. Test send_message
# Should receive message in Telegram
```

---

## Summary

- Skill created at: `skills/telegram-connector/`
- MCP server at: `skills/telegram-connector/scripts/server.py`
- Cost: **FREE** (Telegram Bot API)
- Requires: Bot token from @BotFather