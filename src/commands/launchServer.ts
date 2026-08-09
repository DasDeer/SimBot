
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import { config } from "../config";

const {
  minecraft: minecraft_location,
  minecraft2: minecraft2_location,
  valheim: valheim_location,
  tekkit: tekkit_location,
  factorioExe,
  factorioSave,
  factorioCwd,
} = config.serverPaths;

const { factorio: factorio_port } = config.serverPorts;

export let mcserver: import("child_process").ChildProcessWithoutNullStreams | null = null;
export let mcserver2: import("child_process").ChildProcessWithoutNullStreams | null = null;
export let tekkitserver: import("child_process").ChildProcessWithoutNullStreams | null = null;
export let factorioProcess: ChildProcess | null = null;

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
        { name: "Minecraft2", value: "minecraft2" },
        { name: "Valheim", value: "valheim" },
        { name: "Factorio", value: "factorio" }
      )
  );

function startServer(game: string): string {
  switch (game) {
    case "minecraft":
      if (!minecraft_location) {
        return "MINECRAFT_SERVER_PATH is not configured in .env.";
      }
      mcserver = spawn("java.exe", ["-jar", "server.jar"], {
        cwd: minecraft_location,
        detached: true,
        stdio: "pipe"
      });
      return "Minecraft server started!";

    case "minecraft2":
      if (!minecraft2_location) {
        return "MINECRAFT2_SERVER_PATH is not configured in .env.";
      }
      mcserver2 = spawn("java.exe", ["-jar", "server.jar"], {
        cwd: minecraft2_location,
        detached: true,
        stdio: "pipe"
      });
      return "Minecraft2 server started!";

    case "valheim":
      if (!valheim_location) {
        return "VALHEIM_SERVER_PATH is not configured in .env.";
      }
      spawn("cmd.exe", ["/C", "start", "cmd.exe", "/K", "start_headless_server.bat"], {
        cwd: valheim_location,
        detached: true,
        stdio: "ignore"
      });
      return "Valheim server started!";
    case "tekkit":
      if (!tekkit_location) {
        return "TEKKIT_SERVER_PATH is not configured in .env.";
      }
      tekkitserver = spawn("java.exe", ["-jar", "minecraft_server.1.12.2.jar"], {
        cwd: tekkit_location,
        detached: true,
        stdio: "pipe"
      });
      return "Tekkit server started!";
    case "factorio":
      if (!factorioExe || !factorioSave) {
        return "Factorio server settings are not configured in .env.";
      }
      factorioProcess = spawn(
        factorioExe,
        ["--start-server", factorioSave, `--port ${factorio_port}`],
        {
          cwd: factorioCwd || path.dirname(factorioExe),
          detached: true,
          stdio: "inherit",
          windowsHide: false,
        }
      );
      factorioProcess.unref();

      factorioProcess.on("exit", () => {
        factorioProcess = null;
      });
      return "Factorio server started!";
    default:
      return "Unknown server!";
  }
}

export function clearMinecraft(): void {
  mcserver = null;
}

export function clearMinecraft2(): void {
  mcserver2 = null;
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

export function stopFactorio(): string {
  if (!factorioProcess) return "Server is not running.";

  factorioProcess.kill("SIGTERM");
  factorioProcess = null;

  return "Factorio server stopping.";
}