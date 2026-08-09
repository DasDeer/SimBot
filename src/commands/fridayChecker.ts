
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
// Removed invalid import of 'datetime' module

export const data = new SlashCommandBuilder()
  .setName("friday")
  .setDescription("Check if it is Friday or not.");

export async function execute(interaction: CommandInteraction) {

    const d = new Date();

    // In TS, getDay() returns 5 for Friday (0=Sunday, 1=Monday, ..., 5=Friday)
    if (d.getDay() === 5){
            return interaction.reply(":tada: :tada: :tada: :partying_face: :partying_face: :partying_face: ▀▄▀▄▀▄   🎀  FREDAG IS PARTY DAY  🎀   ▄▀▄▀▄▀ :partying_face: :partying_face: :partying_face: :tada: :tada: :tada: \n https://www.youtube.com/watch?v=DfEnIFV2-mc")
        }
    else {
        return interaction.reply("ente fredag, röven \n https://www.youtube.com/watch?v=aWIE0PX1uXk")
    }

}