
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { spawn, type ChildProcess  } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { time } from "console";



export const data = new SlashCommandBuilder()
  .setName("weather")
  .setDescription("Get weather information about any city in the world")
  .addStringOption(option =>
    option
      .setName("city")
      .setDescription("Enter the name of a city")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100)
  );


export async function execute(interaction: CommandInteraction) {
  const chatInputInteraction = interaction as ChatInputCommandInteraction;
  const city = chatInputInteraction.options.getString("city");

  if (city) {
    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/geocoding?city=${city}`,{
        headers: {
          "X-Api-Key": process.env.geoCodingAPIKey || "",
        }
      });
      
      const jsonData = await response.json();
      const latitude = jsonData[0].latitude;
      const longitude = jsonData[0].longitude;

      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&past_days=0&forecast_days=1`);
      const weatherResponseData = await weatherResponse.json();

      const current = weatherResponseData.current;
      const utcOffsetSeconds = weatherResponseData.utc_offset_seconds || 0;

      const weatherData = {
        temperature_2m: current.temperature_2m,
        relative_humidity_2m: current.relative_humidity_2m,
        apparent_temperature: current.apparent_temperature,
        is_day: current.is_day,
        precipitation: current.precipitation,
        rain: current.rain,
        showers: current.showers,
        snowfall: current.snowfall,
        weather_code: current.weather_code,
        cloud_cover: current.cloud_cover,
        pressure_msl: current.pressure_msl,
        surface_pressure: current.surface_pressure,
        wind_speed_10m: current.wind_speed_10m,
        wind_direction_10m: current.wind_direction_10m,
        wind_gusts_10m: current.wind_gusts_10m,
      };

const embed = new EmbedBuilder()
  .setColor(0x0099ff)
  .setTitle(`🌤️ Weather for ${city}`)
  .addFields(
    { name: "Temperature", value: `${current.temperature_2m}°C`, inline: true },
    { name: "Humidity", value: `${current.relative_humidity_2m}%`, inline: true },
    { name: "Feels Like", value: `${current.apparent_temperature}°C`, inline: true },
    { name: "Is Day", value: current.is_day ? "Yes" : "No", inline: true },
    { name: "Precipitation", value: `${current.precipitation}mm`, inline: true },
    { name: "Rain", value: `${current.rain}mm`, inline: true },
    { name: "Showers", value: `${current.showers}mm`, inline: true },
    { name: "Snowfall", value: `${current.snowfall}cm`, inline: true },
    { name: "Cloud Cover", value: `${current.cloud_cover}%`, inline: true },
    { name: "Wind Speed", value: `${current.wind_speed_10m} km/h`, inline: true },
    { name: "Wind Direction", value: `${current.wind_direction_10m}°`, inline: true },
    { name: "Wind Gusts", value: `${current.wind_gusts_10m} km/h`, inline: true },
    { name: "Pressure", value: `${current.pressure_msl} hPa`, inline: true }
  )
  .setTimestamp();

await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error("Weather command error:", error);
      await interaction.reply({
        content: `❌ An error occurred while fetching weather data. Please try again later.`,
        flags: 64,
      });
    }
  }
}
   