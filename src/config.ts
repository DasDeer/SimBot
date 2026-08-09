import dotenv from "dotenv";

dotenv.config();

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  GUILD_ID,
  RCON_PASSWORD,
  MINECRAFT_SERVER_PATH,
  MINECRAFT2_SERVER_PATH,
  VALHEIM_SERVER_PATH,
  TEKKIT_SERVER_PATH,
  FACTORIO_SERVER_EXE,
  FACTORIO_SERVER_SAVE,
  FACTORIO_SERVER_CWD,
  MINECRAFT_PORT,
  MINECRAFT2_PORT,
  VALHEIM_PORT,
  FACTORIO_PORT,
  MINECRAFT_RCON_PORT,
  MINECRAFT2_RCON_PORT,
  MINECRAFT_PASSWORD,
  MINECRAFT2_PASSWORD,
  VALHEIM_PASSWORD,
  FACTORIO_PASSWORD,
} = process.env;

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  guildID: GUILD_ID ?? process.env.guildID ?? null,
  rcon: RCON_PASSWORD,
  serverPaths: {
    minecraft: MINECRAFT_SERVER_PATH ?? "",
    minecraft2: MINECRAFT2_SERVER_PATH ?? "",
    valheim: VALHEIM_SERVER_PATH ?? "",
    tekkit: TEKKIT_SERVER_PATH ?? "",
    factorioExe: FACTORIO_SERVER_EXE ?? "",
    factorioSave: FACTORIO_SERVER_SAVE ?? "",
    factorioCwd: FACTORIO_SERVER_CWD ?? "",
  },
  serverPorts: {
    minecraft: Number(MINECRAFT_PORT ?? 0),
    minecraft2: Number(MINECRAFT2_PORT ?? 0),
    valheim: Number(VALHEIM_PORT ?? 0),
    factorio: Number(FACTORIO_PORT ?? 0),
    minecraftRcon: Number(MINECRAFT_RCON_PORT ?? 0),
    minecraft2Rcon: Number(MINECRAFT2_RCON_PORT ?? 0),
  },
  passwords: {
    minecraft: MINECRAFT_PASSWORD ?? "",
    minecraft2: MINECRAFT2_PASSWORD ?? "",
    valheim: VALHEIM_PASSWORD ?? "",
    factorio: FACTORIO_PASSWORD ?? "",
  },
};

if (!config.DISCORD_TOKEN || !config.DISCORD_CLIENT_ID) {
  console.warn("DISCORD_TOKEN and DISCORD_CLIENT_ID are not set. Add them to your .env file before running the bot.");
}
