import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { removeEventFromStore } from "./raidEvent";

export const data = new SlashCommandBuilder()
  .setName("delete-event")
  .setDescription("Delete a raid event by its unique event ID")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
  .addStringOption(option =>
    option
      .setName("event-id")
      .setDescription("Unique ID shown in the raid event post")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(36)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: "Raid events can only be deleted from the server where they were created.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents)) {
    await interaction.reply({
      content: "You need the Manage Events permission to delete a raid event.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const eventId = interaction.options.getString("event-id", true).trim();
  const event = removeEventFromStore(eventId, interaction.guildId);
  if (!event) {
    await interaction.reply({
      content: "No raid event with that ID was found in this server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  let postStatus: string;
  try {
    const channel = await interaction.guild.channels.fetch(event.channelId);
    if (!channel?.isTextBased() || !("messages" in channel)) {
      postStatus = "The event was removed from storage, but its original channel is no longer available.";
    } else {
      const message = await channel.messages.fetch(event.messageId);
      await message.delete();
      postStatus = "The event post was deleted.";
    }
  } catch (error) {
    console.error(`Failed to remove the Discord post for raid event ${event.id}:`, error);
    postStatus = "The event was removed from storage, but Discord could not delete its post. Check the bot's channel permissions.";
  }

  await interaction.reply({
    content: `🗑️ Deleted **${event.name}** (\`${event.id}\`). ${postStatus}`,
    flags: MessageFlags.Ephemeral
  });
}
