const { PrismaClient } = require("@prisma/client");
const { PermissionsBitField } = require("discord.js");
const { adminUser, ownerUser } = require("../config.json");

const _prisma = new PrismaClient();

module.exports = {
  name: "token",
  description: "Sets the active X token of the bot. Only works in DMs",
  options: [
    {
      name: "x_token",
      type: 3,
      description: "The token to set",
      required: true,
    },
  ],
  ephemeral: true,
  async execute(interaction, args, bot) {
    try {
      // check if the command is not used in DM
      if (interaction.guild) {
        return interaction.reply({
          content: "This command only works in DMs",
          ephemeral: true,
        });
      }

      // Check if the user's id equals the owner or admin Id
      if (
        interaction.user.id !== ownerUser &&
        interaction.user.id !== adminUser
      ) {
        return interaction.reply({
          content: "You don't have permission to run this command.",
          ephemeral: true,
        });
      }

      const token = args[0];

      const currentTokens = await _prisma.tokens.findMany({
        where: {
          is_active: true,
        },
      });

      await _prisma.tokens.create({
        data: {
          token: token,
        },
      });

      for (const i in currentTokens) {
        await _prisma.tokens.delete({
          where: {
            id: currentTokens[i].id,
          },
        });
      }

      await interaction.reply("Token has been set successfully!");
    } catch (e) {
      console.error(e);
      await interaction.reply(
        "There was an error while executing this command!",
      );
    }
  },
};
