import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { stopAudio } from "./playAudio";

export const data = new SlashCommandBuilder()
  .setName("stop-audio")
  .setDescription("Stop the current audio and leave the voice channel.");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply("This command can only be used in a server.");
    return;
  }

  await interaction.deferReply();
  stopAudio(interaction.guildId);
  await interaction.deleteReply();
}