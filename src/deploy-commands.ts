import { REST, Routes } from "discord.js";
import { config } from "./config";
import { commands } from "./commands";

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

const commandDataByName = new Map(
  commands.map(command => [command.data.name, command.data.toJSON()])
);

export function getCommandsForGuild(guildId: string) {
  const guild = config.guilds.find(configuredGuild => configuredGuild.id === guildId);
  if (!guild) return [];

  return guild.commands
    .map(commandName => commandDataByName.get(commandName))
    .filter(command => command !== undefined);
}

export async function deployCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

    if (!config.DISCORD_CLIENT_ID) {
      throw new Error("DISCORD_CLIENT_ID is not defined in config.");
    }

    await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: [] });

    for (const guild of config.guilds) {
      if (!guild.id) continue;

      await rest.put(
        Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, guild.id),
        { body: getCommandsForGuild(guild.id) }
      );
    }

    console.log("Successfully reloaded guild-specific application (/) commands.");
  } catch (error) {
    console.error("Failed to deploy guild-specific application commands.", error);
  }
}
