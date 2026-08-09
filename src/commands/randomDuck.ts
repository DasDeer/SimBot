
import { CommandInteraction, SlashCommandBuilder} from "discord.js";


export const data = new SlashCommandBuilder()
  .setName("duck")
  .setDescription("Get a random duck image");


export async function execute(interaction: CommandInteraction) {
  const response = await fetch("https://random-d.uk/api/v2/random");
  let url = (await response.json()).url;

await interaction.reply(url);

}