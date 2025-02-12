// factPoster.js
import { EmbedBuilder } from "discord.js";
import fs from "fs/promises";

class FactPoster {
  constructor() {
    this.textMessages = [];
    this.imageMessages = [];
    this.postedMessages = new Set();
    this.postedImageMessages = new Set();
    this.lastPostTime = null;
  }

  async initialize() {
    try {
      // Load messages from JSON files
      const textMessagesRaw = await fs.readFile("./messages.json", "utf-8");
      const imageMessagesRaw = await fs.readFile(
        "./image-messages.json",
        "utf-8"
      );

      this.textMessages = JSON.parse(textMessagesRaw);
      this.imageMessages = JSON.parse(imageMessagesRaw);

      console.log(
        `Loaded ${this.textMessages.length} text messages and ${this.imageMessages.length} image messages`
      );
    } catch (error) {
      console.error("Error loading message files:", error);
      throw error;
    }
  }

  getRandomMessage(isImage = false) {
    const messages = isImage ? this.imageMessages : this.textMessages;
    const postedSet = isImage ? this.postedImageMessages : this.postedMessages;

    // If all messages have been posted, reset the tracking
    if (postedSet.size >= messages.length) {
      console.log("Resetting message tracker");
      postedSet.clear();
    }

    // Get unposted messages
    const unpostedMessages = messages.filter(
      (_, index) => !postedSet.has(index)
    );

    // Select random unposted message
    const randomIndex = Math.floor(Math.random() * unpostedMessages.length);
    const messageIndex = messages.indexOf(unpostedMessages[randomIndex]);

    // Track this message as posted
    postedSet.add(messageIndex);

    return messages[messageIndex];
  }

  shouldPost() {
    // Only check time-based conditions
    if (this.lastPostTime && Date.now() - this.lastPostTime < 36000000) {
      console.log("Not enough time has passed since last post");
      return false;
    }
    return true;
  }

  async postRandomFact(channel) {
    try {
      // Check if we should post based on time
      if (!this.shouldPost()) {
        return;
      }

      // Randomly choose between text and image message
      const isImage = Math.random() < 0.5 && this.imageMessages.length > 0;
      const message = this.getRandomMessage(isImage);

      if (!message) {
        console.error("No message available");
        return;
      }

      if (isImage) {
        const embed = new EmbedBuilder()
          .setColor(message.color || "#0099ff")
          .setTitle(message.title)
          .setDescription(message.description)
          .setImage(message.image);

        await channel.send({ embeds: [embed] });
      } else {
        await channel.send(message);
      }

      // Update last post time
      this.lastPostTime = Date.now();
      console.log("Posted new fact");
    } catch (error) {
      console.error("Error posting fact:", error);
    }
  }
}

export default FactPoster;
