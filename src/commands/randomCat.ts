
import { CommandInteraction, SlashCommandBuilder} from "discord.js";


export const data = new SlashCommandBuilder()
  .setName("cat")
  .setDescription("Get a random cat image");


export async function execute(interaction: CommandInteraction) {
  const response = await fetch("https://api.thecatapi.com/v1/images/search");
  let url = (await response.json())[0].url;

await interaction.reply(url);

}