import dotenv from "dotenv";
import guildCommandConfig from "./utils/guildCommands.local.json";

dotenv.config();

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  rcon
} = process.env;

if (!DISCORD_TOKEN) {
  throw new Error("Missing environment variables");
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  guilds: guildCommandConfig.map(guild => ({
    id: guild.guildId,
    commands: guild.commands
      .map(command => command.trim().toLowerCase())
      .filter(Boolean)
  })),
  rcon
};
