import { Client } from "discord.js";
import { deployCommands, getCommandsForGuild } from "./deploy-commands";
import { commands } from "./commands";
import { config } from "./config";
import { handleInteraction as handleRaidEventInteraction } from "./commands/raidEvent";

const client = new Client({
  intents: [
    "Guilds",
    "GuildMessages",
    "DirectMessages",
    "GuildMembers",
    "GuildVoiceStates",
    "GuildEmojisAndStickers"
  ],
});

client.once("clientReady", async () => {
  console.log("SimBot is ready! 🤖");
  await deployCommands();
});

// Build a map of command name to command module
const commandMap = new Map(commands.map(cmd => [cmd.data.name, cmd]));

client.on("interactionCreate", async interaction => {
  if (
    (interaction.isButton() || interaction.isStringSelectMenu())
    && interaction.customId.startsWith("simbot:raid:")
  ) {
    try {
      await handleRaidEventInteraction(interaction);
    } catch (error) {
      console.error("Raid event interaction error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error updating this raid event. Please try again.",
          flags: 64
        });
      } else {
        await interaction.reply({
          content: "There was an error updating this raid event. Please try again.",
          flags: 64
        });
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  if (!interaction.guildId || !getCommandsForGuild(interaction.guildId).some(
    configuredCommand => configuredCommand.name === interaction.commandName
  )) {
    await interaction.reply({
      content: "This command is not enabled in this server.",
      flags: 64
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("There was an error executing this command.");
    } else {
      await interaction.reply({ content: "There was an error executing this command.", flags: 64 });
    }
  }
});

client.login(config.DISCORD_TOKEN);