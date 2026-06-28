#!/usr/bin/env python3
"""
Telegram Chatbot with Groq - Polling version
"""

import os
import sys
import requests
import json
from groq import Groq

# Force unbuffered output
sys.stdout.flush()
sys.stderr.flush()

TELEGRAM_API = "https://api.telegram.org/bot"
BOT_TOKEN = "8723279307:AAFQjVS1bmbXQljxgZAuwcou1R1aazxPAgY"
GROQ_API_KEY = "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"

client = Groq(api_key=GROQ_API_KEY)

def get_updates(offset=0):
    url = f"{TELEGRAM_API}{BOT_TOKEN}/getUpdates"
    params = {"offset": offset, "timeout": 1}
    response = requests.get(url, params=params, timeout=5)
    return response.json()

def send_message(chat_id, text):
    url = f"{TELEGRAM_API}{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    response = requests.post(url, json=payload)
    return response.json()

def get_ai_response(message):
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": f"Responde siempre en español, de manera amable y breve: {message}"}],
        temperature=0.7
    )
    return response.choices[0].message.content

def main():
    print("🤖 Chatbot iniciado! Esperando mensajes...", flush=True)
    offset = 0
    
    while True:
        try:
            print("Consultando actualizaciones...", flush=True)
            updates = get_updates(offset)
            print(f"Updates: {updates}", flush=True)
            if updates.get("ok") and updates.get("result"):
                print(f"Mensajes pendientes: {len(updates['result'])}", flush=True)
                for update in updates["result"]:
                    offset = update["update_id"] + 1
                    if "message" in update:
                        chat_id = update["message"]["chat"]["id"]
                        text = update["message"]["text"]
                        print(f"Mensaje recibido: {text}", flush=True)
                        
                        reply = get_ai_response(text)
                        print(f"Respuesta IA: {reply[:50]}...", flush=True)
                        
                        result = send_message(chat_id, reply)
                        print(f"Enviado: {result}", flush=True)
            else:
                print("Sin mensajes nuevos", flush=True)
        except Exception as e:
            print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    main()