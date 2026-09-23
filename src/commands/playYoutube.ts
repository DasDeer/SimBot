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
import { spawn } from "child_process";
import ytDlp from "youtube-dl-exec";
import { registerAudioSession, stopAudio } from "./playAudio";

function isYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const data = new SlashCommandBuilder()
  .setName("play-youtube")
  .setDescription("Play audio from a YouTube video in a voice channel.")
  .addChannelOption(option =>
    option
      .setName("channel")
      .setDescription("The voice channel to join")
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  )
  .addStringOption(option =>
    option
      .setName("url")
      .setDescription("The YouTube video URL")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  const url = interaction.options.getString("url", true);
  const guildId = interaction.guildId;
  const guild = interaction.guild;

  if (!guildId || !guild) {
    await interaction.reply("This command can only be used in a server.");
    return;
  }
  if (!isYoutubeUrl(url)) {
    await interaction.reply("Please provide a valid YouTube URL.");
    return;
  }
  if (!ffmpegPath) {
    await interaction.reply("Audio playback is not available on this system.");
    return;
  }

  await interaction.deferReply();
  stopAudio(guildId);

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId,
    adapterCreator: guild.voiceAdapterCreator
  });
  const player = createAudioPlayer();
  const source = ytDlp.exec(url, {
    format: "bestaudio/best",
    output: "-",
    quiet: true,
    noWarnings: true
  });
  const ffmpeg = spawn(ffmpegPath, [
    "-hide_banner",
    "-loglevel", "error",
    "-i", "pipe:0",
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1"
  ], { stdio: ["pipe", "pipe", "ignore"] });

  try {
    source.stdout?.on("error", error => {
      if ((error as NodeJS.ErrnoException).code !== "EPIPE") {
        console.error("YouTube stream error.", error);
      }
    });
    ffmpeg.stdin?.on("error", error => {
      if ((error as NodeJS.ErrnoException).code !== "EPIPE") {
        console.error("FFmpeg input error.", error);
      }
    });
    source.stdout?.pipe(ffmpeg.stdin!);
    connection.subscribe(player);
    registerAudioSession(guildId, { connection, player, ffmpeg, source });
    player.play(createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw }));

    await new Promise<void>((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, resolve);
      player.once("error", reject);
      source.once("error", reject);
      ffmpeg.once("error", reject);
      ffmpeg.once("close", code => {
        if (code !== 0) reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
    await interaction.deleteReply();
  } catch (error) {
    console.error("Failed to play YouTube audio.", error);
    await interaction.editReply("I could not play that YouTube video.");
  } finally {
    source.stdout?.unpipe(ffmpeg.stdin!);
    source.stdout?.destroy();
    ffmpeg.stdin?.destroy();
    source.kill();
    ffmpeg.kill();
    player.stop();
    connection.destroy();
  }
}