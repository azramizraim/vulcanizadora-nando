#!/usr/bin/env python3
"""
Telegram Connector - Direct tool implementation for OpenCode

Usage:
    python scripts/telegram.py send_message --chat_id "10016235" --text "Hello!"
    python scripts/telegram.py get_updates
    python scripts/telegram.py get_me
"""

import argparse
import os
import requests
import sys
from typing import Optional

TELEGRAM_API = "https://api.telegram.org/bot"


def get_token() -> str:
    """Get bot token from environment."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set. Set via: export TELEGRAM_BOT_TOKEN='your-token'")
    return token


def get_api_url() -> str:
    return f"{TELEGRAM_API}{get_token()}"


def send_message(chat_id: str, text: str) -> dict:
    """Send a message to a Telegram chat."""
    url = f"{get_api_url()}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    response = requests.post(url, json=payload)
    return response.json()


def send_photo(chat_id: str, photo: str, caption: Optional[str] = None) -> dict:
    """Send a photo."""
    url = f"{get_api_url()}/sendPhoto"
    payload = {"chat_id": chat_id, "photo": photo}
    if caption:
        payload["caption"] = caption
    response = requests.post(url, json=payload)
    return response.json()


def get_updates(offset: int = 0, limit: int = 100) -> dict:
    """Get recent updates."""
    url = f"{get_api_url()}/getUpdates"
    payload = {"offset": offset, "limit": limit}
    response = requests.post(url, json=payload)
    return response.json()


def set_webhook(url: str) -> dict:
    """Set webhook URL."""
    api_url = f"{get_api_url()}/setWebhook"
    payload = {"url": url}
    response = requests.post(api_url, json=payload)
    return response.json()


def delete_webhook() -> dict:
    """Delete webhook."""
    url = f"{get_api_url()}/deleteWebhook"
    response = requests.post(url)
    return response.json()


def get_me() -> dict:
    """Get bot information."""
    url = f"{get_api_url()}/getMe"
    response = requests.post(url)
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="Telegram Connector CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # send_message command
    msg_parser = subparsers.add_parser("send_message")
    msg_parser.add_argument("--chat_id", required=True, help="Target chat ID")
    msg_parser.add_argument("--text", required=True, help="Message text")
    
    # send_photo command
    photo_parser = subparsers.add_parser("send_photo")
    photo_parser.add_argument("--chat_id", required=True, help="Target chat ID")
    photo_parser.add_argument("--photo", required=True, help="Photo URL or file path")
    photo_parser.add_argument("--caption", help="Photo caption (optional)")
    
    # get_updates command
    updates_parser = subparsers.add_parser("get_updates")
    updates_parser.add_argument("--offset", type=int, default=0)
    updates_parser.add_argument("--limit", type=int, default=100)
    
    # set_webhook command
    webhook_parser = subparsers.add_parser("set_webhook")
    webhook_parser.add_argument("--url", required=True, help="Webhook URL")
    
    # delete_webhook command
    subparsers.add_parser("delete_webhook")
    
    # get_me command
    subparsers.add_parser("get_me")
    
    args = parser.parse_args()
    
    try:
        if args.command == "send_message":
            result = send_message(args.chat_id, args.text)
        elif args.command == "send_photo":
            result = send_photo(args.chat_id, args.photo, args.caption)
        elif args.command == "get_updates":
            result = get_updates(args.offset, args.limit)
        elif args.command == "set_webhook":
            result = set_webhook(args.url)
        elif args.command == "delete_webhook":
            result = delete_webhook()
        elif args.command == "get_me":
            result = get_me()
        else:
            parser.print_help()
            sys.exit(1)
        
        print(result)
        if result.get("ok"):
            print("Success!" if result.get("ok") else "Failed!")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()