import { Client } from "discord.js";
import { deployCommands } from "./deploy-commands";
import { commands } from "./commands";
import { config } from "./config";

const client = new Client({
  intents: ["Guilds", "GuildMessages", "DirectMessages", "GuildMembers"],
});

client.once("clientReady", async () => {
  console.log("SimBot is ready! 🤖");
  await deployCommands();
});

// Build a map of command name to command module
const commandMap = new Map(commands.map(cmd => [cmd.data.name, cmd]));

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "There was an error executing this command.", flags: 64 });
  }
});

client.login(config.DISCORD_TOKEN);