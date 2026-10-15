# SimBot

A small Discord bot for managing game servers and a few fun or utility commands.

## Features

- Start and stop Minecraft / Valheim / Factorio server processes
- Check public IPs and server passwords
- OSRS-related utility commands
- Random cat and duck commands
- Weather and other misc helper commands
- WoW raid-event creation and class/spec signup tracking

## Requirements

- Node.js 18+
- npm
- A Discord bot token
- Local game server paths and ports configured in your `.env` file

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with the required values:

```env
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_discord_application_id

RCON_PASSWORD=your_rcon_password
MINECRAFT_PASSWORD=your_minecraft_password
MINECRAFT2_PASSWORD=your_minecraft2_password
VALHEIM_PASSWORD=your_valheim_password
FACTORIO_PASSWORD=your_factorio_password

MINECRAFT_PORT=
MINECRAFT2_PORT=
VALHEIM_PORT=
FACTORIO_PORT=
MINECRAFT_RCON_PORT=
MINECRAFT2_RCON_PORT=

MINECRAFT_SERVER_PATH=C:\path\to\minecraft
MINECRAFT2_SERVER_PATH=C:\path\to\minecraft2
VALHEIM_SERVER_PATH=C:\path\to\valheim\server
TEKKIT_SERVER_PATH=C:\path\to\tekkit
FACTORIO_SERVER_EXE=C:\path\to\factorio.exe
FACTORIO_SERVER_SAVE=C:\path\to\save.zip
FACTORIO_SERVER_CWD=C:\path\to\factorio
```

3. Copy `src/utils/guildCommands.json` to `src/utils/guildCommands.local.json`, then edit the local file with each guild's commands:

```json
[
	{
		"guildId": "your_first_guild_id",
		"commands": ["startserver", "stopserver", "ip"]
	},
	{
		"guildId": "your_second_guild_id",
		"commands": ["weather", "cat", "duck"]
	}
]
```

`guildCommands.local.json` is ignored by Git because it contains private guild IDs. It is the file loaded by the bot at runtime.

4. Start the bot in development mode:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Notes

- `.env` is intentionally ignored by Git so secrets do not get published.
- The bot deploys guild-specific slash commands when it starts. Guild commands usually update quickly.
- Commands are deployed per guild. Leave a guild's command list empty to enable all commands there, or list specific commands to limit the guild's commands.
- Use `/create-event` with a name, a date in `YYYY-MM-DD` format, and a time in 24-hour `HH:MM` format. Date and time are displayed exactly as entered. The public event post includes Accept and Remove Me buttons; users choose their class and specialization from private menus, and the post updates with the roster and role totals. The private signup prompt is removed after a successful signup.
- Users with the Manage Events permission can use `/delete-event` with the event's unique ID to remove the event and its post.
- Event data is stored in `data/raid-events.json` so signups survive bot restarts. Keep this file with the bot's runtime data.
- The event uses the guild's custom emojis named `tank`, `healer`, `dps`, and each WoW class (for example, `warlock` and `druid`). These emoji names must exist in the server.
- Supported command names include `create-event`, `delete-event`, `friday`, `ip`, `startserver`, `stopserver`, `grand-exchange`, `weather`, `duck`, and `cat`.
- Server paths and ports are expected to be valid for your machine and runtime environment.

## Project scripts

```bash
npm run dev     # watch and run the bot in development mode
npm run build   # compile the TypeScript project
```

## License

ISC
