import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  ApplicationCommandOptionType,
  EmbedBuilder,
} from "discord.js";
import axios from "axios";
import dotenv from "dotenv";
import FactPoster from "./fact-poster.js";

dotenv.config();

// Replace 'YOUR_CHANNEL_ID' with the actual ID of your #general channel
const GENERAL_CHANNEL_ID = process.env.CHANNEL_ID;
const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID;
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;
const GUILD_ID = process.env.GUILD_ID; // Your testing guild (server) ID
const factPoster = new FactPoster();
const commands = [
  {
    name: "neftie",
    description: "Get Neftie information by different languages",
    options: [
      {
        name: "name",
        description: "Name of the neftie",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "language",
        description: "Shorthand of language (default: en)",
        type: ApplicationCommandOptionType.String,
        choices: [
          { name: "english", value: "en" },
          { name: "deutsch", value: "de" },
          { name: "français", value: "fr" },
          { name: "brazil (pt)", value: "br" },
          { name: "espanol", value: "es" },
          { name: "türkçe", value: "tr" },
          { name: "italiano", value: "it" },
          { name: "portuguese", value: "pt" },
        ],
        required: false,
      },
    ],
  },
  {
    name: "leaderboard",
    description: "Show the top 10 players on the leaderboard",
  },
  {
    name: "tier-list",
    description: "Show the tier list of current patch. Voted by players.",
  },
  {
    name: "elements",
    description: "Shows how different elements interact with each other",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.CLIENT_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
      {
        body: commands,
      }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  shards: "auto", // This tells Discord.js to automatically determine shard count
  shardCount: 1,
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  try {
    // Initialize the fact poster
    await factPoster.initialize();

    // Get the channel
    const channel = client.channels.cache.get(GENERAL_CHANNEL_ID);

    if (!channel) {
      console.error("Could not find the general channel!");
      return;
    }

    // Optional: Post initial fact
    await factPoster.postRandomFact(channel);

    // Set up the interval for posting facts (10 hours = 36000000 milliseconds)
    setInterval(() => {
      factPoster.postRandomFact(channel);
    }, 3_600_000);
  } catch (error) {
    console.error("Error setting up fact poster:", error);
  }
});

let previousTopPlayers = [];

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "elements") {
    // First check channel
    if (interaction.channelId !== GENERAL_CHANNEL_ID) {
      await interaction.reply({
        content:
          "This command can only be used in the #seekers-of-tokane channel.",
        ephemeral: true,
      });
      return; // Important: return here to prevent further execution
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Neftie Element Interaction")
      .setDescription("This is how elements/nefties interact with each other")
      .setImage("https://neftie.gg/images/elements-with-nefties.png");

    await interaction.reply({ embeds: [embed] });
    return; // Add return here too
  }

  if (interaction.commandName === "tier-list") {
    if (interaction.channelId !== GENERAL_CHANNEL_ID) {
      await interaction.reply({
        content: "This command can only be used in the test channel.",
        ephemeral: true,
      });
      return;
    }
    try {
      const response = await axios.get(
        "https://neftie.gg/api/public-tier-list"
      );

      const tiers = response.data.data; // Assuming the response directly contains the tier data

      // Create the embed for the tier list
      const embed = new EmbedBuilder()
        .setColor("#c27070")
        .setTitle(
          `Seekers of Tokane - Neftie Tier List (${response.data.patch})`
        )
        .setURL("https://neftie.gg/tier-list")
        .setThumbnail("https://neftie.gg/images/logo-black.png")
        .setDescription(
          `Here is the current tier list for the patch voted by the users.\n[VOTE NOW!](https://neftie.gg/tier-list)`
        )
        .addFields(
          {
            name: "S Tier",
            value:
              tiers.sTier.length > 0
                ? tiers.sTier.join(", ")
                : "No Nefties in this tier",
            inline: false,
          },
          {
            name: "A Tier",
            value:
              tiers.aTier.length > 0
                ? tiers.aTier.join(", ")
                : "No Nefties in this tier",
            inline: false,
          },
          {
            name: "B Tier",
            value:
              tiers.bTier.length > 0
                ? tiers.bTier.join(", ")
                : "No Nefties in this tier",
            inline: false,
          },
          {
            name: "C Tier",
            value:
              tiers.cTier.length > 0
                ? tiers.cTier.join(", ")
                : "No Nefties in this tier",
            inline: false,
          },
          {
            name: "D Tier",
            value:
              tiers.dTier.length > 0
                ? tiers.dTier.join(", ")
                : "No Nefties in this tier",
            inline: false,
          }
        );

      // Reply with the embed in the interaction
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to retrieve leaderboard:", error);
      await interaction.reply(
        "Failed to retrieve the leaderboard. Please try again later."
      );
    }
    return;
  }
  // Handle /leaderboard command only from the test channel
  if (interaction.commandName === "leaderboard") {
    if (interaction.channelId !== GENERAL_CHANNEL_ID) {
      await interaction.reply({
        content: "This command can only be used in the test channel.",
        ephemeral: true,
      });
      return;
    }

    try {
      const currentMonth = new Date()
        .toLocaleString("en-US", { month: "long" })
        .toUpperCase();

      const response = await axios.get(
        `https://aggregator-api.live.aurory.io/v1/leaderboards?mode=pvp&event=${currentMonth}_2025`
      );
      const topPlayers = response.data.players.slice(0, 10);

      const embed = new EmbedBuilder()
        .setColor("#c27070")
        .setTitle("Seekers of Tokane - TOP 10 PLAYERS")
        .setURL("https://app.aurory.io/leaderboard")
        .setDescription(`Here are the top 10 players of ${currentMonth}:`)
        .addFields(
          topPlayers.map((player, index) => ({
            name: `#${index + 1} - ${player.player.player_name}`,
            value: `Score: **${player.score}**`,
            inline: true,
          }))
        );
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to retrieve leaderboard:", error);
      await interaction.reply(
        "Failed to retrieve the leaderboard. Please try again later."
      );
    }
    return;
  }

  // Check if the command is issued in the #seekers-of-tokane channel
  if (interaction.channelId !== GENERAL_CHANNEL_ID) {
    await interaction.reply({
      content:
        "This command can only be used in the #seekers-of-tokane channel.",
      ephemeral: true, // Sends the message only to the user who triggered the interaction
    });
    return;
  }

  if (interaction.commandName === "neftie") {
    const neftieName = interaction.options
      .get("name")
      ?.value.replace(" ", "-")
      .toLowerCase();
    const language = interaction.options.get("language")?.value || "en";

    try {
      const response = await axios.get(
        `https://neftie.gg/api/public-nefties?name=${neftieName}&lang=${language}`
      );

      const neftieData = response.data.data[0]; // Assuming the API returns an array of Nefties
      if (!neftieData) {
        await interaction.reply(
          `No data found for Neftie named "${neftieName}".`
        );
        return;
      }

      // Extract and format data for the embed
      const { name, description, skills, good_against, bad_against, image } =
        neftieData;
      // URL for the Neftie
      const neftieUrl = `https://neftie.gg/neftie/${neftieName}`;
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(name)
        .setURL(neftieUrl)
        .setThumbnail(image) // Add thumbnail image
        .setDescription(description || "No description available")
        .addFields(
          { name: "\u200B", value: "\u200B" },
          {
            name: "🔹",
            value:
              skills
                .map(
                  (skill) =>
                    `**${skill.name}**: ${skill.description} (${skill.hype} HYPE)`
                )
                .join("\n\n") || "No skills available",
            inline: false,
          },
          { name: "\u200B", value: "\u200B" },
          {
            name: ":rocket:",
            value: good_against.join("\n") || "None",
            inline: true,
          },
          {
            name: ":thumbsdown::skin-tone-1:",
            value: bad_against.join("\n") || "None",
            inline: true,
          }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply(
        "Failed to retrieve Neftie information. Please try again later."
      );
    }
  }
});

try {
  client.login(process.env.CLIENT_TOKEN);
} catch (e) {
  console.log("client log in issue ---> ", e);
}
