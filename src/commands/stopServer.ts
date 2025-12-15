
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn } from "child_process";
import * as path from "path";
import { mcserver, tekkitserver, factorioProcess } from "./launchServer";
import { RCON } from "minecraft-server-util";
import { config } from "../config";

async function stopMinecraftRcon() {
  const rcon = new RCON();
  await rcon.connect("localhost", 25575)
  if (!config.rcon)
      throw new Error("rcon not defined in config.");
  await rcon.login(config.rcon)
  await rcon.run("stop");
  await rcon.close();
}


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
        { name: "Factorio", value: "factorio" }
      )
  );

// Function to stop the selected server
function stopServer(game: string): string {
  switch (game) {
    case "minecraft":
      if (mcserver && mcserver.stdin.writable) {
        stopMinecraftRcon();
        return "Sent stop command to Minecraft server!";
      }
      return "Minecraft server is not running or not tracked!";
    case "valheim":
      spawn("taskkill", ["/im", "valheim_server.exe", "/f"]);
      return "Sent kill command to Valheim server!";
    case "factorio":
      if (factorioProcess) {
        factorioProcess.kill("SIGTERM");
        return "Sent stop command to Factorio server!";
      }
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