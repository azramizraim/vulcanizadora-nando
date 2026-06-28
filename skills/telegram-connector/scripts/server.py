#!/usr/bin/env python3
"""Telegram Connector MCP Server"""

from fastmcp import FastMCP
import requests
import os
from typing import Optional

mcp = FastMCP("Telegram Connector")

TELEGRAM_API = "https://api.telegram.org/bot"


def get_token() -> str:
    """Get bot token from environment."""
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
    payload = {"chat_id": chat_id, "text": text}
    response = requests.post(url, json=payload)
    return response.json()


@mcp.tool()
def send_photo(chat_id: str, photo: str, caption: Optional[str] = None) -> dict:
    """Send a photo to a Telegram chat."""
    url = f"{get_api_url()}/sendPhoto"
    payload = {"chat_id": chat_id, "photo": photo}
    if caption:
        payload["caption"] = caption
    response = requests.post(url, json=payload)
    return response.json()


@mcp.tool()
def get_updates(offset: int = 0, limit: int = 100) -> dict:
    """Get recent updates from the bot."""
    url = f"{get_api_url()}/getUpdates"
    payload = {"offset": offset, "limit": limit}
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
    mcp.run(transport="stdio")