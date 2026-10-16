import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
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
import {
  AudioSession,
  isAudioPlaying,
  queueYoutubeAudio,
  registerAudioSession,
  unregisterAudioSession
} from "./playAudio";

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

function stopTrack(session: AudioSession): void {
  session.source?.kill();
  session.source?.stdout?.destroy();
  session.ffmpeg?.kill();
  session.player.stop();
}

async function playTrack(session: AudioSession, url: string): Promise<void> {
  const source = ytDlp.exec(url, {
    format: "bestaudio/best",
    output: "-",
    quiet: true,
    noWarnings: true
  });
  const ffmpeg = spawn(ffmpegPath!, [
    "-hide_banner",
    "-loglevel", "error",
    "-i", "pipe:0",
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1"
  ], { stdio: ["pipe", "pipe", "ignore"] });
  session.source = source;
  session.ffmpeg = ffmpeg;

  let skipped = false;
  const skipCurrent = () => {
    skipped = true;
    stopTrack(session);
  };
  session.skipCurrent = skipCurrent;

  void source.catch(error => {
    if (!skipped && (error as { signalCode?: string }).signalCode !== "SIGTERM") {
      console.error("YouTube downloader failed.", error);
    }
  });

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

    await new Promise<void>((resolve, reject) => {
      const onIdle = () => resolve();
      const onError = (error: Error) => skipped ? resolve() : reject(error);
      session.player.once(AudioPlayerStatus.Idle, onIdle);
      session.player.once("error", onError);
      source.once("error", onError);
      ffmpeg.once("error", onError);
      ffmpeg.once("close", code => {
        if (code !== 0 && !skipped) {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
      source.stdout?.pipe(ffmpeg.stdin!);
      session.player.play(createAudioResource(ffmpeg.stdout, { inputType: StreamType.Raw }));
    });
  } finally {
    session.player.removeAllListeners(AudioPlayerStatus.Idle);
    session.player.removeAllListeners("error");
    source.stdout?.unpipe(ffmpeg.stdin!);
    source.kill();
    source.stdout?.destroy();
    ffmpeg.stdin?.end();
    ffmpeg.kill();
    if (session.source === source) session.source = undefined;
    if (session.ffmpeg === ffmpeg) session.ffmpeg = undefined;
    if (session.skipCurrent === skipCurrent) session.skipCurrent = undefined;
  }
}

async function playQueue(
  guildId: string,
  session: AudioSession,
  firstUrl: string
): Promise<void> {
  let url: string | undefined = firstUrl;
  try {
    while (url) {
      try {
        await playTrack(session, url);
      } catch (error) {
        console.error("Failed to play YouTube audio.", error);
      }
      url = session.queue?.shift();
    }
  } finally {
    stopTrack(session);
    session.connection.destroy();
    unregisterAudioSession(guildId, session);
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
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

  if (isAudioPlaying(guildId)) {
    const position = queueYoutubeAudio(guildId, url);
    if (position === undefined) {
      await interaction.reply({
        content: "Audio is already playing. YouTube tracks can only be queued during YouTube playback.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    await interaction.reply({
      content: `Added to the YouTube queue at position ${position}.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId,
    adapterCreator: guild.voiceAdapterCreator
  });
  const session: AudioSession = {
    connection,
    player: createAudioPlayer(),
    queue: []
  };
  connection.subscribe(session.player);

  if (!registerAudioSession(guildId, session)) {
    connection.destroy();
    const position = queueYoutubeAudio(guildId, url);
    await interaction.editReply(
      position === undefined
        ? "Audio is already playing. YouTube tracks can only be queued during YouTube playback."
        : `Added to the YouTube queue at position ${position}.`
    );
    return;
  }

  try {
    await interaction.editReply("Started YouTube playback.");
  } catch (error) {
    unregisterAudioSession(guildId, session);
    connection.destroy();
    throw error;
  }

  void playQueue(guildId, session, url);
}
