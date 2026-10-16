import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { skipYoutubeAudio } from "./playAudio";

export const data = new SlashCommandBuilder()
  .setName("next-audio")
  .setDescription("Skip to the next queued YouTube track.");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const skipped = skipYoutubeAudio(interaction.guildId);
  await interaction.reply({
    content: skipped ? "Skipping to the next queued YouTube track." : "There is no queued YouTube track to skip to.",
    flags: MessageFlags.Ephemeral
  });
}
