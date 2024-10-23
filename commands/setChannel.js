const { PrismaClient } = require("@prisma/client");
const { PermissionsBitField } = require("discord.js");
const { adminUser } = require("../config.json");

const _prisma = new PrismaClient();

module.exports = {
  name: "channel",
  description: "Sets the channel where the bot will send X updates",
  options: [
    {
      name: "channel",
      type: 7,
      description: "The channel to set",
      required: true,
    },
  ],
  ephemeral: true,
  async execute(interaction, args, bot) {
    try {
      // Check if the user has MANAGE_GUILD permission or the specific user ID
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageGuild,
        ) &&
        interaction.user.id !== adminUser
      ) {
        return interaction.reply({
          content: "You don't have permission to run this command.",
          ephemeral: true,
        });
      }

      const channelId = args[0];
      const channel = bot.channels.cache.get(channelId);

      if (!channel) {
        return interaction.reply({
          content: "I couldn't find that channel.",
          ephemeral: true,
        });
      }

      const currentChannel = await _prisma.channel.findMany();

      for (const c of currentChannel) {
        await _prisma.channel.delete({
          where: {
            id: c.id,
          },
        });
      }

      await _prisma.channel.create({
        data: {
          channel_id: channelId,
        },
      });

      await interaction.reply(
        `Channel has been set successfully to <#${channel.id}>!`,
      );
    } catch (e) {
      console.error(e);
      await interaction.reply(
        "There was an error while executing this command!",
      );
    }
  },
};
