
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn } from "child_process";
import https from "https";

export function getPublicIP(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get("https://api.ipify.org", (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data.trim()));
    }).on("error", reject);
  });
}


export const data = new SlashCommandBuilder()
  .setName("ip")
  .setDescription("Check IP and password for a specific game")
  .addStringOption(option =>
    option
      .setName("game")
      .setDescription("Choose a game")
      .setRequired(false)
      .addChoices(
        { name: "Minecraft", value: "minecraft" },
        { name: "Valheim", value: "valheim" },
        { name: "Tekkit", value: "tekkit" },
        { name: "Factorio", value: "factorio" }
      )
  );

// ...existing imports...

export async function ip(game: string): Promise<string> {
  const ip = await getPublicIP();
  switch (game) {
    case "minecraft":
      return `IP: ${ip} Password: drgodis`;
    case "valheim":
      return `IP: ${ip}:2456 Password: bajsbajs`;
    case "tekkit":
      return `IP: ${ip}`;
    case "factorio":
      return `IP: ${ip}:34197`;
    default:
      return "Unknown game!";
  }
}

export async function execute(interaction: CommandInteraction) {
  const chatInputInteraction = interaction as ChatInputCommandInteraction;
  const game = chatInputInteraction.options.getString("game");
  try {
    if (game) {
      const result = await ip(game);
      await interaction.reply(result);
    } else {
      await interaction.reply("No game selected.");
    }
  } catch (error) {
    await interaction.reply("Failed to fetch IP address.");
    console.error(error);
  }
}