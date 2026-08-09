
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn } from "child_process";
import { mcserver, mcserver2 } from "./launchServer";
import { stopFactorio, clearMinecraft, clearMinecraft2 } from "./launchServer";
import { RCON } from "minecraft-server-util";
import { config } from "../config";

async function stopMinecraftRcon(MCInstant: "minecraft" | "minecraft2") {
  const rcon = new RCON();
  const rconPort = MCInstant === "minecraft"
    ? config.serverPorts.minecraftRcon
    : config.serverPorts.minecraft2Rcon;

  await rcon.connect("localhost", rconPort);

  if (!config.rcon) {
    throw new Error("RCON_PASSWORD is not defined in .env.");
  }

  await rcon.login(config.rcon);
  await rcon.run("stop");
  rcon.close();
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
        { name: "Minecraft2", value: "minecraft2" },
        { name: "Valheim", value: "valheim" },
        { name: "Factorio", value: "factorio" }
      )
  );

function stopServer(game: string): string {
  switch (game) {
    case "minecraft":
      if (mcserver && mcserver.stdin.writable) {
        void stopMinecraftRcon("minecraft");
        clearMinecraft();
        return "Sent stop command to Minecraft server!";
      }
      return "Minecraft server is not running or not tracked!";

    case "minecraft2":
      if (mcserver2 && mcserver2.stdin.writable) {
        void stopMinecraftRcon("minecraft2");
        clearMinecraft2();
        return "Sent stop command to Minecraft server!";
      }
      return "Minecraft server is not running or not tracked!";

    case "valheim":
      spawn("taskkill", ["/im", "valheim_server.exe", "/f"]);
      return "Sent kill command to Valheim server!";
    case "factorio":
      return stopFactorio();
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
