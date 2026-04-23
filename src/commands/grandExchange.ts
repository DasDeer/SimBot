
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { spawn, type ChildProcess  } from "child_process";
import * as fs from "fs";
import * as path from "path";



export const data = new SlashCommandBuilder()
  .setName("grand-exchange")
  .setDescription("Get info about an item on the Grand Exchange")
  .addStringOption(option =>
    option
      .setName("item")
      .setDescription("Enter the name of the item")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100)
  );

  function validateItemName(name: string): { id: number; name: string } | null {
    const itemsPath = path.join(__dirname, "../../src/utils/OSRS_items.json");
    const itemsData = JSON.parse(fs.readFileSync(itemsPath, "utf-8"));
    const items = itemsData as { [key: string]: number };
    
    const lowerName = name.toLowerCase();
    
    // Search case-insensitively
    for (const [itemName, itemId] of Object.entries(items)) {
      if (itemName.toLowerCase() === lowerName) {
        return { id: itemId, name: itemName };
      }
    }
    
    return null;
  }

  let itemMappingCache: { [key: number]: { id: number; name: string; examine: string; members: boolean; lowalch: number; highalch: number; icon: string; icon_large: string } } | null = null;

  async function getItemMapping() {
    if (itemMappingCache) {
      return itemMappingCache;
    }
    
    try {
      const response = await fetch("https://prices.runescape.wiki/api/v1/osrs/mapping");
      const data = await response.json() as Array<any>;
      
      itemMappingCache = {};
      data.forEach(item => {
        itemMappingCache![item.id] = item;
      });
      
      // Log first item to see structure
      if (data.length > 0) {
        console.log("Sample item from mapping:", JSON.stringify(data[0], null, 2));
      }
      
      return itemMappingCache;
    } catch (error) {
      console.error("Failed to fetch item mapping:", error);
      return null;
    }
  }

  async function getGrandExchangeInfo(itemId: number, itemName: string, interaction: ChatInputCommandInteraction) {
    try {
      // Get item details from mapping
      const mapping = await getItemMapping();
      if (!mapping) {
        return interaction.reply("Failed to fetch item data. Please try again later.");
      }
      
      const itemDetails = mapping[itemId];
      if (!itemDetails) {
        return interaction.reply(`Item with ID ${itemId} not found in OSRS.`);
      }
      
      // Construct icon URL
      const iconUrl = itemDetails.icon ? `https://oldschool.runescape.wiki/images/${encodeURIComponent(itemDetails.icon.replace(/ /g, "_"))}` : undefined;
      console.log(`Item: ${itemDetails.name}`);
      console.log(`Icon filename: ${itemDetails.icon}`);
      console.log(`Icon URL: ${iconUrl}`);

      // Get current prices
      const priceUrl = `https://prices.runescape.wiki/api/v1/osrs/latest?id=${itemId}`;
      console.log(`Fetching prices from: ${priceUrl}`);
      const priceResponse = await fetch(priceUrl);
      
      let high = 0;
      let low = 0;
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        const priceInfo = priceData.data?.[itemId];
        if (priceInfo) {
          high = priceInfo.high ?? 0;
          low = priceInfo.low ?? 0;
        }
      }

      const midPrice = high && low ? Math.round((high + low) / 2) : 0;

      const embed = {
        color: 0x1f8b4c,
        title: itemDetails.name,
        description: itemDetails.examine || "No description available",
        thumbnail: {
          url: iconUrl || ""
        },
        fields: [
          {
            name: "High Price",
            value: high > 0 ? `${high.toLocaleString()} gp` : "N/A",
            inline: true
          },
          {
            name: "Low Price",
            value: low > 0 ? `${low.toLocaleString()} gp` : "N/A",
            inline: true
          },
          {
            name: "Mid Price",
            value: midPrice > 0 ? `${midPrice.toLocaleString()} gp` : "N/A",
            inline: true
          },
          {
            name: "Members",
            value: itemDetails.members ? "Yes" : "No",
            inline: true
          },
          {
            name: "High Alch",
            value: `${itemDetails.highalch.toLocaleString()} gp`,
            inline: true
          },
          {
            name: "Low Alch",
            value: `${itemDetails.lowalch.toLocaleString()} gp`,
            inline: true
          }
        ],
        footer: {
          text: `Item ID: ${itemId}`
        }
      };

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply("Failed to fetch item data from the OSRS Grand Exchange.");
      console.error(error);
    }
  }


export async function execute(interaction: CommandInteraction) {
  const chatInputInteraction = interaction as ChatInputCommandInteraction;
  const item = chatInputInteraction.options.getString("item");
  if (item) {
    const itemResult = validateItemName(item);

    if (itemResult !== null) {
      await getGrandExchangeInfo(itemResult.id, itemResult.name, chatInputInteraction);
    } else {
      await chatInputInteraction.reply(`Item "${item}" not found.`);
    }

  } 
}