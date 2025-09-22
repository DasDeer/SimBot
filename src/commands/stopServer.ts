
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn } from "child_process";
import * as path from "path";
import { mcserver, tekkitserver } from "./launchServer";


export const data = new SlashCommandBuilder()
  .setName("stopserver")
  .setDescription("Stop a game server")
  .addStringOption(option =>
    option
      .setName("game")
      .setDescription("Choose a server to start")
      .setRequired(false)
      .addChoices(
        { name: "Minecraft", value: "minecraft" },
        { name: "Valheim", value: "valheim" },
        { name: "Tekkit", value: "tekkit" },
        { name: "Factorio", value: "factorio" }
      )
  );

// Function to stop the selected server
function stopServer(game: string): string {
  switch (game) {
    case "minecraft":
      if (mcserver && mcserver.stdin.writable) {
        mcserver.stdin.write("stop\n");
        return "Sent stop command to Minecraft server!";
      }
      return "Minecraft server is not running or not tracked!";
    case "valheim":
      spawn("taskkill", ["/im", "valheim_server.exe", "/f"]);
      return "Sent kill command to Valheim server!";
    case "tekkit":
      if (tekkitserver && tekkitserver.stdin.writable) {
        tekkitserver.stdin.write("stop\n");
        return "Sent stop command to Tekkit server!";
      }
      return "Tekkit server is not running or not tracked!";
    default:
      return "Unknown server!";
  }
}

export async function execute(interaction: CommandInteraction) {
  const chatInputInteraction = interaction as ChatInputCommandInteraction;
  const game = chatInputInteraction.options.getString("game");
  if (game) {
    const result = stopServer(game);
    await interaction.reply(result);
  } else {
    await interaction.reply("No game selected.");
  }
}