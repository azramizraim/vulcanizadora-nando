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

## Installation

```bash
# Install dependencies
pip install fastmcp requests

# Set your bot token
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
```

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

### delete_webhook
Delete the current webhook.

### get_me
Get bot information.

## Configuration

### Environment Variables

Set in your shell or `.env`:

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
```

## Quick Start

### Step 1: Create Bot
1. Open Telegram → @BotFather
2. /newbot
3. Name: "My Assistant"
4. Username: myassistant_bot (must be unique)
5. Copy token

### Step 2: Get Your Chat ID
1. Start chat with your bot
2. Send any message
3. Open: https://api.telegram.org/bot<TOKEN>/getUpdates
4. Find "chat":{"id":123456789}
5. Copy the id (your chat_id)

### Step 3: Configure OpenCode
```bash
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGHI..."
```

### Step 4: Test
Use send_message tool with chat_id and text parameters.

## Cost
**100% FREE** - Telegram Bot API is completely free.