import telebot
import os
import time
import json
import logging
from collections import deque

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# Token and destination channel
TOKEN = "7983702636:AAGw-LB7V6in3NxfsDNmopUFozoBFaHT9do"  # Your new bot token
DEST_CHANNEL = '@NobleFlix'

if not TOKEN:
    raise ValueError("Bot Token is not set. Please set it before running the bot.")

if not DEST_CHANNEL.startswith('@'):
    raise ValueError("DEST_CHANNEL must start with '@'. Please provide a valid channel username.")

bot = telebot.TeleBot(TOKEN)

# File to store queue data
QUEUE_FILE = "file_queue.json"

# Load the queue from file
def load_queue():
    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE, "r") as file:
            data = json.load(file)
            return deque(data)  # Convert list to deque for FIFO operations
    return deque()

# Save the queue to file
def save_queue(queue):
    with open(QUEUE_FILE, "w") as file:
        json.dump(list(queue), file, indent=4)

# Initialize queue
file_queue = load_queue()

# Format caption for files
def format_caption(file_name):
    formatted_caption = f"[@FilmyEmpire] {file_name}\n\n"
    formatted_caption += ">> ✓ All members join backup channel\n"
    formatted_caption += ">> 𝖩𝗈𝗂𝗇 ➥ @FilmyEmpire"
    return formatted_caption

# Process files from the queue
def process_queue():
    global file_queue
    while file_queue:
        file_data = file_queue[0]  # Peek at the first item in the queue
        file_id = file_data["file_id"]
        file_name = file_data["file_name"]
        file_type = file_data["file_type"]
        caption = file_data["caption"]

        try:
            # Send the file based on its type
            if file_type == "document":
                bot.send_document(DEST_CHANNEL, file_id, caption=caption)
            elif file_type == "video":
                bot.send_video(DEST_CHANNEL, file_id, caption=caption)

            logging.info(f"File sent: {file_name}")
            file_queue.popleft()  # Remove the file from the queue after successful sending
            save_queue(file_queue)  # Save the updated queue

        except Exception as e:
            logging.error(f"Error sending file {file_name}: {e}")
            time.sleep(5)  # Wait before retrying
            break  # Stop processing queue if there is an error to avoid rapid retries

# Handle incoming media files
@bot.message_handler(content_types=['document', 'video'])
def handle_media(message):
    file_id = None
    file_name = None
    file_type = None

    if message.document:
        file_id = message.document.file_id
        file_name = message.document.file_name
        file_type = "document"
    elif message.video:
        file_id = message.video.file_id
        file_name = message.video.file_name
        file_type = "video"

    if not file_id or not file_name:
        logging.warning("File information missing!")
        return

    caption = format_caption(file_name)

    # Add file to queue
    file_queue.append({"file_id": file_id, "file_name": file_name, "file_type": file_type, "caption": caption})
    save_queue(file_queue)  # Save the queue to file
    logging.info(f"File added to queue: {file_name}")

    # Start processing the queue
    process_queue()

# Start bot
@bot.message_handler(commands=['start'])
def start_bot(message):
    bot.send_message(message.chat.id, "Welcome! Send a file, and I will process it in order.")
    logging.info("Bot is running...")

    # Retry processing the queue on bot startup
    process_queue()

# Start polling
while True:
    try:
        bot.polling(none_stop=True)
    except Exception as e:
        logging.error(f"Polling Error: {e}")
        time.sleep(5)  
