
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import https from "https";
import { config } from "../config";

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
        { name: "Minecraft2", value: "minecraft2" },
        { name: "Valheim", value: "valheim" },
        { name: "Factorio", value: "factorio" }
      )
  );

export async function ip(game: string): Promise<string> {
  const ip = await getPublicIP();
  const gamePorts = config.serverPorts;
  const gamePasswords = config.passwords;

  switch (game) {
    case "minecraft":
      return `IP: ${ip}:${gamePorts.minecraft} Password: ${gamePasswords.minecraft || "not configured"}`;
    case "minecraft2":
      return `IP: ${ip}:${gamePorts.minecraft2} Password: ${gamePasswords.minecraft2 || "not configured"}`;
    case "valheim":
      return `IP: ${ip}:${gamePorts.valheim} Password: ${gamePasswords.valheim || "not configured"}`;
    case "factorio":
      return `IP: ${ip}:${gamePorts.factorio} Password: ${gamePasswords.factorio || "not configured"}`;
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