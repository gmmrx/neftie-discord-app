import {
  REST,
  Routes,
  Client,
  GatewayIntentBits,
  ApplicationCommandOptionType,
  EmbedBuilder,
} from "discord.js";
import axios from "axios";

// Replace 'YOUR_CHANNEL_ID' with the actual ID of your #general channel
const GENERAL_CHANNEL_ID = process.env.CHANNEL_ID;

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
          {
            name: "english",
            value: "en",
          },
          {
            name: "deutsch",
            value: "de",
          },
          {
            name: "français",
            value: "fr",
          },
          {
            name: "brazil (pt)",
            value: "br",
          },
          {
            name: "espanol",
            value: "es",
          },
          {
            name: "türkçe",
            value: "tr",
          },
          {
            name: "italiano",
            value: "it",
          },
          {
            name: "portuguese",
            value: "pt",
          },
        ],
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.CLIENT_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands,
      }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
        `https://neftie.app/api/public-nefties?name=${neftieName}&lang=${language}`
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
      const neftieUrl = `https://neftie.app/neftie/${neftieName}`;
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

client.login(process.env.CLIENT_TOKEN);
