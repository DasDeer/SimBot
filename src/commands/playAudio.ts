
import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from "discord.js";
import {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel
} from "@discordjs/voice";
import ffmpegPath from "ffmpeg-static";
import { existsSync, readdirSync } from "fs";
import { spawn, type ChildProcess } from "child_process";
import path from "path";

const supportedExtensions = new Set([".flac", ".m4a", ".mp3", ".ogg", ".oga", ".wav", ".webm"]);
const audioDirectories = [
  path.resolve(__dirname, "../audio"),
  path.resolve(process.cwd(), "src/audio"),
  path.resolve(process.cwd(), "audio")
];

function getAudioDirectory(): string {
  return audioDirectories.find(directory => existsSync(directory)) ?? audioDirectories[0];
}

function getAudioFiles(): string[] {
  try {
    return readdirSync(getAudioDirectory(), { withFileTypes: true })
      .filter(entry => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
      .map(entry => entry.name)
      .sort();
  } catch {
    return [];
  }
}

const audioFiles = getAudioFiles();

export type AudioSession = {
  connection: ReturnType<typeof joinVoiceChannel>;
  player: ReturnType<typeof createAudioPlayer>;
  ffmpeg: ReturnType<typeof spawn>;
  source?: ChildProcess;
};

const activeAudioSessions = new Map<string, AudioSession>();

export function registerAudioSession(guildId: string, session: AudioSession): void {
  activeAudioSessions.set(guildId, session);
}

function stopAudioSession(session: AudioSession): void {
  if (session.source?.stdout && session.ffmpeg.stdin) {
    session.source.stdout.unpipe(session.ffmpeg.stdin);
    session.source.kill();
    session.source.stdout.destroy();
    session.ffmpeg.stdin.end();
  }
  session.source?.kill();
  session.ffmpeg.kill();
  session.player.stop();
  session.connection.destroy();
}

export function stopAudio(guildId: string): boolean {
  const session = activeAudioSessions.get(guildId);
  if (!session) return false;

  stopAudioSession(session);
  activeAudioSessions.delete(guildId);
  return true;
}

export const data = new SlashCommandBuilder()
  .setName("play-audio")
  .setDescription("Play an audio file in a voice chat.")
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("The voice channel to join")
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  )
  .addStringOption(option =>
    option
      .setName("sound")
      .setDescription("The sound file to play from the audio folder")
      .setRequired(true)
      .addChoices(audioFiles.slice(0, 25).map(file => ({ name: file, value: file })))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  const requestedFile = interaction.options.getString("sound", true);
  const fileName = audioFiles.find(file => file.toLowerCase() === requestedFile.toLowerCase());
  const audioPath = fileName && path.join(getAudioDirectory(), fileName);

  if (!audioPath || !existsSync(audioPath) || !ffmpegPath) {
    await interaction.reply("That sound file is not available.");
    return;
  }

  const guildId = interaction.guildId;
  const guild = interaction.guild;
  if (!guildId || !guild) {
    await interaction.reply("This command can only be used in a server.");
    return;
  }

  await interaction.deferReply();

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId,
    adapterCreator: guild.voiceAdapterCreator
  });
  const player = createAudioPlayer();
  const ffmpeg = spawn(ffmpegPath, [
    "-hide_banner",
    "-loglevel", "error",
    "-i", audioPath,
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1"
  ], { stdio: ["ignore", "pipe", "ignore"] });

  try {
    connection.subscribe(player);
    registerAudioSession(guildId, { connection, player, ffmpeg });
    player.play(createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw }));

    await new Promise<void>((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, resolve);
      player.once("error", reject);
      ffmpeg.once("error", reject);
      ffmpeg.once("close", code => {
        if (code !== 0) reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
    await interaction.deleteReply();
  } catch (error) {
    console.error("Failed to play audio.", error);
    await interaction.editReply("I could not play that sound file.");
  } finally {
    ffmpeg.kill();
    player.stop();
    connection.destroy();
    if (activeAudioSessions.get(guildId)?.connection === connection) {
      activeAudioSessions.delete(guildId);
    }
  }
}

