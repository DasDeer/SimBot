import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction
} from "discord.js";

type Role = "Tank" | "Healer" | "Melee DPS" | "Ranged DPS";

type ClassSignup = {
  className: string;
  specialization: string;
};

type StatusSignup = {
  status: "tentative" | "deny";
};

type Signup = ClassSignup | StatusSignup;

function isClassSignup(signup: Signup): signup is ClassSignup {
  return "className" in signup && "specialization" in signup;
}

function isStatusSignup(signup: Signup): signup is StatusSignup {
  return "status" in signup
    && (signup.status === "tentative" || signup.status === "deny");
}

type RaidEvent = {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  name: string;
  date: string;
  time: string;
  signups: Record<string, Signup>;
};

const eventStorePath = path.join(process.cwd(), "data", "raid-events.json");
const customIdPrefix = "simbot:raid";

const classData: Record<string, { specializations: Record<string, Role> }> = {
  Druid: {
    specializations: {
      Balance: "Ranged DPS",
      Feral: "Melee DPS",
      Guardian: "Tank",
      Restoration: "Healer"
    }
  },
  Hunter: {
    specializations: {
      "Beast Mastery": "Ranged DPS",
      Marksmanship: "Ranged DPS",
      Survival: "Melee DPS"
    }
  },
  Mage: {
    specializations: { Arcane: "Ranged DPS", Fire: "Ranged DPS", Frost: "Ranged DPS" }
  },
  Paladin: {
    specializations: {
      Holy: "Healer",
      Protection: "Tank",
      Retribution: "Melee DPS"
    }
  },
  Priest: {
    specializations: {
      Discipline: "Healer",
      Holy: "Healer",
      Shadow: "Ranged DPS"
    }
  },
  Rogue: {
    specializations: {
      Assassination: "Melee DPS",
      Outlaw: "Melee DPS",
      Subtlety: "Melee DPS"
    }
  },
  Shaman: {
    specializations: {
      Elemental: "Ranged DPS",
      Enhancement: "Melee DPS",
      Restoration: "Healer"
    }
  },
  Warlock: {
    specializations: { Affliction: "Ranged DPS", Demonology: "Ranged DPS", Destruction: "Ranged DPS" }
  },
  Warrior: {
    specializations: { Arms: "Melee DPS", Fury: "Melee DPS", Protection: "Tank" }
  }
};

function emojiForGuild(guild: Guild, name: string): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const customEmoji = guild.emojis.cache.find(emoji =>
    emoji.name?.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedName
  );
  if (!customEmoji) {
    throw new Error(`Required guild emoji :${name.toLowerCase()}: was not found in ${guild.name}.`);
  }
  return customEmoji.toString();
}

function emojiOptionForGuild(guild: Guild, name: string) {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const customEmoji = guild.emojis.cache.find(emoji =>
    emoji.name?.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedName
  );
  if (!customEmoji) {
    throw new Error(`Required guild emoji :${name.toLowerCase()}: was not found in ${guild.name}.`);
  }
  return { id: customEmoji.id, name: customEmoji.name ?? undefined };
}

export const data = new SlashCommandBuilder()
  .setName("create-event")
  .setDescription("Create a WoW raid signup event")
  .addStringOption(option =>
    option
      .setName("name")
      .setDescription("Name of the raid event")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100)
  )
  .addStringOption(option =>
    option
      .setName("date")
      .setDescription("Event date in YYYY-MM-DD format")
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(10)
  )
  .addStringOption(option =>
    option
      .setName("time")
      .setDescription("Event time in 24-hour HH:MM format")
      .setRequired(true)
      .setMinLength(5)
      .setMaxLength(5)
  );

function isValidDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function isRaidEvent(value: unknown): value is RaidEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RaidEvent>;
  if (
    typeof event.id !== "string"
    || typeof event.guildId !== "string"
    || typeof event.channelId !== "string"
    || typeof event.messageId !== "string"
    || typeof event.name !== "string"
    || typeof event.date !== "string"
    || typeof event.time !== "string"
    || !event.signups
    || typeof event.signups !== "object"
  ) {
    return false;
  }
  return Object.entries(event.signups).every(([userId, signup]) => {
    if (userId.length === 0 || !signup || typeof signup !== "object") return false;
    const candidate = signup as Record<string, unknown>;
    if (candidate.status === "tentative" || candidate.status === "deny") return true;
    return candidate.status === undefined
      && typeof candidate.className === "string"
      && typeof candidate.specialization === "string";
  });
}

function loadEvents(): RaidEvent[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(eventStorePath, "utf8"));
    if (!Array.isArray(parsed) || !parsed.every(isRaidEvent)) {
      throw new Error("Raid event data is invalid; expected an array of valid raid events.");
    }
    return parsed as RaidEvent[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function saveEvents(events: RaidEvent[]): void {
  const directory = path.dirname(eventStorePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = `${eventStorePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(events, null, 2), "utf8");
  fs.renameSync(temporaryPath, eventStorePath);
}

function getEvent(eventId: string): RaidEvent | undefined {
  return loadEvents().find(event => event.id === eventId);
}

export function removeEventFromStore(eventId: string, guildId: string): RaidEvent | undefined {
  const events = loadEvents();
  const event = events.find(candidate =>
    candidate.id === eventId && candidate.guildId === guildId
  );
  if (!event) return undefined;
  saveEvents(events.filter(candidate => candidate.id !== eventId));
  return event;
}

function buttonRow(eventId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}:accept:${eventId}`)
      .setLabel("Accept")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}:tentative:${eventId}`)
      .setLabel("Tentative")
      .setEmoji("❔")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}:deny:${eventId}`)
      .setLabel("Deny")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${customIdPrefix}:remove:${eventId}`)
      .setLabel("Remove Me")
      .setEmoji("➖")
      .setStyle(ButtonStyle.Secondary)
  );
}

function createEventEmbeds(event: RaidEvent, guild: Guild): EmbedBuilder[] {
  const validSignups = Object.entries(event.signups).filter(([, signup]) =>
    isStatusSignup(signup)
    || (isClassSignup(signup)
      && !!classData[signup.className]?.specializations[signup.specialization])
  );
  const classSignups = validSignups.filter(
    (entry): entry is [string, ClassSignup] => isClassSignup(entry[1])
  );
  const signups = classSignups.map(([, signup]) => signup);
  const tentativeSignups = validSignups.filter(
    ([, signup]) => isStatusSignup(signup) && signup.status === "tentative"
  );
  const deniedSignups = validSignups.filter(
    ([, signup]) => isStatusSignup(signup) && signup.status === "deny"
  );
  const countRole = (role: Role) =>
    signups.filter(signup => classData[signup.className]?.specializations[signup.specialization] === role).length;

  let currentEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📅 ${event.name}`)
    .setDescription(`**Date:** ${event.date}\n**Time:** ${event.time}\n**Event ID:** \`${event.id}\``)
    .addFields(
      { name: "👥 Participants", value: String(signups.length), inline: true },
      { name: "❔ Tentative", value: String(tentativeSignups.length), inline: true },
      { name: "❌ Deny", value: String(deniedSignups.length), inline: true },
      { name: `${emojiForGuild(guild, "tank")} Tanks`, value: String(countRole("Tank")), inline: true },
      { name: `${emojiForGuild(guild, "healer")} Healers`, value: String(countRole("Healer")), inline: true },
      { name: `${emojiForGuild(guild, "dps")} Melee DPS`, value: String(countRole("Melee DPS")), inline: true },
      { name: `${emojiForGuild(guild, "dps")} Ranged DPS`, value: String(countRole("Ranged DPS")), inline: true }
    );

  const embeds = [currentEmbed];
  let fieldCount = 7;
  let textLength = currentEmbed.toJSON().title!.length
    + currentEmbed.toJSON().description!.length
    + currentEmbed.toJSON().fields!.reduce(
      (total, field) => total + field.name.length + field.value.length,
      0
    );

  const addRosterField = (fieldName: string, fieldValue: string) => {
    if (fieldCount >= 25 || textLength + fieldName.length + fieldValue.length > 5700) {
      currentEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${event.name} — participants (continued)`)
        .setDescription(`Event ID: \`${event.id}\``);
      embeds.push(currentEmbed);
      fieldCount = 0;
      textLength = currentEmbed.toJSON().title!.length + currentEmbed.toJSON().description!.length;
    }
    currentEmbed.addFields({ name: fieldName, value: fieldValue });
    fieldCount += 1;
    textLength += fieldName.length + fieldValue.length;
  };

  for (const className of Object.keys(classData)) {
    const entries = classSignups
      .map(([userId, signup], index) => ({ userId, signup, number: index + 1 }))
      .filter(({ signup }) => signup.className === className)
      .map(({ userId, signup, number }) =>
        `**${number}.** <@${userId}> — ${signup.specialization}`
      );
    if (entries.length === 0) continue;
    const lines = entries;
    let chunk = "";
    let chunkIndex = 0;

    const addChunk = () => {
      const fieldName = `${emojiForGuild(guild, className)} ${className}${chunkIndex > 0 ? " (continued)" : ""}`;
      addRosterField(fieldName, chunk);
      chunk = "";
      chunkIndex += 1;
    };

    for (const line of lines) {
      const nextChunk = chunk ? `${chunk}\n${line}` : line;
      if (nextChunk.length > 1000) addChunk();
      chunk = chunk ? `${chunk}\n${line}` : line;
    }
    addChunk();
  }

  for (const [fieldName, entries] of [
    ["Tentative", tentativeSignups],
    ["Deny", deniedSignups]
  ] as const) {
    let chunk = "";
    let chunkIndex = 0;
    const addChunk = () => {
      addRosterField(`${fieldName}${chunkIndex > 0 ? " (continued)" : ""}`, chunk);
      chunk = "";
      chunkIndex += 1;
    };

    for (const [userId] of entries) {
      const line = `<@${userId}>`;
      const nextChunk = chunk ? `${chunk}\n${line}` : line;
      if (nextChunk.length > 1000) addChunk();
      chunk = chunk ? `${chunk}\n${line}` : line;
    }
    if (chunk) addChunk();
  }

  if (validSignups.length === 0) {
    currentEmbed.addFields({ name: "Roster", value: "No participants yet." });
  }

  if (embeds.length > 10) {
    throw new Error("This event roster is too large to fit in a Discord message.");
  }
  return embeds;
}

function createClassMenu(eventId: string, userId: string, guild: Guild) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${customIdPrefix}:class:${eventId}:${userId}`)
    .setPlaceholder("Choose your WoW class")
    .addOptions(
      Object.keys(classData).map(className => ({
        label: className,
        value: className,
        emoji: emojiOptionForGuild(guild, className)
      }))
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function createSpecializationMenu(eventId: string, userId: string, className: string) {
  const classInfo = classData[className];
  const classKey = className.toLowerCase().replace(/ /g, "-");
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${customIdPrefix}:spec:${eventId}:${userId}:${classKey}`)
    .setPlaceholder("Choose your specialization")
    .addOptions(
      Object.keys(classInfo.specializations).map(specialization => ({
        label: specialization,
        value: specialization
      }))
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString("name", true).trim();
  const date = interaction.options.getString("date", true);
  const time = interaction.options.getString("time", true);

  if (!name) {
    await interaction.reply({ content: "Event name cannot be blank.", flags: 64 });
    return;
  }
  if (!isValidDate(date)) {
    await interaction.reply({ content: "Enter a valid date in YYYY-MM-DD format.", flags: 64 });
    return;
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    await interaction.reply({ content: "Enter a valid 24-hour time in HH:MM format.", flags: 64 });
    return;
  }
  if (!interaction.guildId) {
    await interaction.reply({ content: "Raid events can only be created in a server.", flags: 64 });
    return;
  }
  if (!interaction.guild) {
    await interaction.reply({ content: "Could not load the server's guild emojis.", flags: MessageFlags.Ephemeral });
    return;
  }

  const event: RaidEvent = {
    id: randomUUID(),
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: "",
    name,
    date,
    time,
    signups: {}
  };

  await interaction.reply({
    embeds: createEventEmbeds(event, interaction.guild),
    components: [buttonRow(event.id)]
  });
  const message = await interaction.fetchReply();
  event.messageId = message.id;
  try {
    saveEvents([...loadEvents(), event]);
  } catch (error) {
    console.error("Failed to persist raid event:", error);
    await interaction.editReply({
      content: "❌ The event could not be saved, so signup has been disabled.",
      embeds: [],
      components: []
    });
  }
}

async function updateEventMessage(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  event: RaidEvent
): Promise<void> {
  if (!interaction.guild || interaction.guildId !== event.guildId) {
    throw new Error("The event belongs to a different server.");
  }
  const channel = await interaction.guild.channels.fetch(event.channelId);
  if (!channel?.isTextBased() || !("messages" in channel)) {
    throw new Error("The event's channel is no longer available.");
  }
  const message = await channel.messages.fetch(event.messageId);
  await message.edit({
    embeds: createEventEmbeds(event, interaction.guild),
    components: [buttonRow(event.id)]
  });
}

export async function handleInteraction(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  const parts = interaction.customId.split(":");
  if (parts[0] !== "simbot" || parts[1] !== "raid") return;

  const action = parts[2];
  const eventId = parts[3];
  const event = eventId ? getEvent(eventId) : undefined;
  if (!event) {
    await interaction.reply({
      content: "This raid event could not be found. It may have been removed or the bot's event data is unavailable.",
      flags: 64
    });
    return;
  }
  if (interaction.guildId !== event.guildId) {
    await interaction.reply({
      content: "This raid event belongs to a different server.",
      flags: 64
    });
    return;
  }

  if ((action === "tentative" || action === "deny") && interaction.isButton()) {
    event.signups[interaction.user.id] = { status: action };
    const events = loadEvents();
    const eventIndex = events.findIndex(existingEvent => existingEvent.id === event.id);
    if (eventIndex < 0) {
      throw new Error(`Raid event ${event.id} disappeared while saving a signup.`);
    }
    events[eventIndex] = event;
    saveEvents(events);

    await interaction.deferUpdate();
    await updateEventMessage(interaction, event);
    return;
  }

  if (action === "accept" && interaction.isButton()) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "Could not load the server's class emojis.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.reply({
      content: `Signing up for **${event.name}**. Choose your class:`,
      components: [createClassMenu(event.id, interaction.user.id, interaction.guild)],
      flags: 64
    });
    return;
  }

  if (action === "class" && interaction.isStringSelectMenu()) {
    const userId = parts[4];
    const className = interaction.values[0];
    if (userId !== interaction.user.id || !classData[className]) {
      await interaction.reply({ content: "This signup menu is not valid for you.", flags: 64 });
      return;
    }
    if (!interaction.guild) {
      await interaction.reply({
        content: "Could not load the server's specialization emojis.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.update({
      content: `You chose **${className}**. Now choose your specialization:`,
      components: [createSpecializationMenu(event.id, userId, className)]
    });
    return;
  }

  if (action === "spec" && interaction.isStringSelectMenu()) {
    const userId = parts[4];
    const classKey = parts[5];
    const selectedClass = Object.keys(classData).find(
      className => className.toLowerCase().replace(/ /g, "-") === classKey
    );
    const specialization = interaction.values[0];
    if (
      userId !== interaction.user.id
      || !selectedClass
      || !classData[selectedClass].specializations[specialization]
    ) {
      await interaction.reply({ content: "This specialization menu is not valid for you.", flags: 64 });
      return;
    }

    event.signups[userId] = { className: selectedClass, specialization };
    const events = loadEvents();
    const eventIndex = events.findIndex(existingEvent => existingEvent.id === event.id);
    if (eventIndex < 0) {
      throw new Error(`Raid event ${event.id} disappeared while saving a signup.`);
    }
    events[eventIndex] = event;
    saveEvents(events);

    await interaction.deferUpdate();
    await updateEventMessage(interaction, event);
      await interaction.deleteReply();
      return;
    }

    if (action === "remove" && interaction.isButton()) {
      if (!event.signups[interaction.user.id]) {
        await interaction.reply({
          content: "You are not signed up for this event.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      delete event.signups[interaction.user.id];
      const events = loadEvents();
      const eventIndex = events.findIndex(existingEvent => existingEvent.id === event.id);
      if (eventIndex < 0) {
        throw new Error(`Raid event ${event.id} disappeared while removing a signup.`);
      }
      events[eventIndex] = event;
      saveEvents(events);

      await interaction.deferUpdate();
      await updateEventMessage(interaction, event);
      return;
    }
}
