
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn } from "child_process";
import * as path from "path";


let minecraft_location = "C:\\Users\\Min dator\\OneDrive\\Dokument\\Servers\\Minecraft";
let valheim_location = "C:\\Users\\Min dator\\OneDrive\\Dokument\\Servers\\Valheim\\server";
let tekkit_location = "C:\\Users\\Min dator\\OneDrive\\Dokument\\Servers\\Tekkit";
let factorio_location = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio";

export let mcserver: import("child_process").ChildProcessWithoutNullStreams | null = null;
export let tekkitserver: import("child_process").ChildProcessWithoutNullStreams | null = null;



export const data = new SlashCommandBuilder()
  .setName("startserver")
  .setDescription("Start a game server")
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

  function startServer(game: string): string {
  switch (game) {
    case "minecraft":
      mcserver = spawn("java.exe", ["-jar", "server.jar"], {
        cwd: minecraft_location,
        detached: true,
        stdio: "pipe"
      });
      return "Minecraft server started!";

    case "valheim":
      spawn("cmd.exe", ["/C", "start", "cmd.exe", "/K", "start_headless_server.bat"], {
        cwd: valheim_location,
        detached: true,
        stdio: "ignore"
      });
      return "Valheim server started!";
    case "tekkit":
      tekkitserver = spawn("java.exe", ["-jar", "minecraft_server.1.12.2.jar"], {
        cwd: tekkit_location,
        detached: true,
        stdio: "pipe"
      });
      return "Tekkit server started!";
    case "factorio":
      spawn("factorio.exe", [], {
        cwd: factorio_location,
        detached: true,
        stdio: "ignore"
      });
      return "Factorio server started!";
    default:
      return "Unknown server!";
  }
}

export async function execute(interaction: CommandInteraction) {
  const chatInputInteraction = interaction as ChatInputCommandInteraction;
  const game = chatInputInteraction.options.getString("game");
  if (game) {
    const result = startServer(game);
    await interaction.reply(result);
  } else {
    await interaction.reply("No game selected.");
  }
}