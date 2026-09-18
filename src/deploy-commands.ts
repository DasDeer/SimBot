import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

const commandsData = commands.map((command) => command.data);

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

export async function deployCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

    if (!config.DISCORD_CLIENT_ID) {
      throw new Error("DISCORD_CLIENT_ID is not defined in config.");
    }

    await rest.put(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID),
      {
        body: commandsData,
      }
    );

    console.log("Successfully reloaded global application (/) commands.");
  } catch (error) {
    console.error("Failed to deploy global application commands.", error);
  }
}
