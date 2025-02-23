import { EmbedBuilder } from "discord.js";
import fs from "fs/promises";

class FactPoster {
  constructor() {
    this.textMessages = [];
    this.imageMessages = [];
    this.postedMessages = new Set();
    this.postedImageMessages = new Set();
    this.lastPostTime = null;
    this.shouldPostImage = true; // New flag to track what type should be posted next
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

    // If all messages of current type have been posted
    if (postedSet.size >= messages.length) {
      console.log(`Resetting ${isImage ? "image" : "text"} message tracker`);
      postedSet.clear();

      // If both sets are empty, we've completed a full cycle
      if (
        this.postedMessages.size === 0 &&
        this.postedImageMessages.size === 0
      ) {
        console.log("Completed full cycle of all messages");
      }
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

  determineMessageType() {
    // If we should post an image but all images are posted and there are unposted texts
    if (
      this.shouldPostImage &&
      this.postedImageMessages.size >= this.imageMessages.length &&
      this.postedMessages.size < this.textMessages.length
    ) {
      this.shouldPostImage = false;
    }
    // If we should post a text but all texts are posted and there are unposted images
    else if (
      !this.shouldPostImage &&
      this.postedMessages.size >= this.textMessages.length &&
      this.postedImageMessages.size < this.imageMessages.length
    ) {
      this.shouldPostImage = true;
    }
    // If both sets are complete, reset everything and start with an image
    else if (
      this.postedMessages.size >= this.textMessages.length &&
      this.postedImageMessages.size >= this.imageMessages.length
    ) {
      this.postedMessages.clear();
      this.postedImageMessages.clear();
      this.shouldPostImage = true;
    }

    return this.shouldPostImage;
  }

  async postRandomFact(channel) {
    try {
      // Check if we should post based on time
      if (!this.shouldPost()) {
        return;
      }

      // Determine if we should post an image or text message
      const isImage = this.determineMessageType();
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

      // Update last post time and toggle message type for next post
      this.lastPostTime = Date.now();
      this.shouldPostImage = !this.shouldPostImage;
      console.log(`Posted new ${isImage ? "image" : "text"} fact`);
    } catch (error) {
      console.error("Error posting fact:", error);
    }
  }
}

export default FactPoster;
