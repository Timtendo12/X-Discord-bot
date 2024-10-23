const { ActivityType, PermissionsBitField } = require("discord.js");
const { adminUser } = require("../config.json");

module.exports = {
  name: "presence",
  description: "Sets the presence of the bot",
  options: [
    {
      name: "type",
      type: 3, // Ensure the type is set correctly
      description: "The type of presence",
      required: true,
      choices: [
        {
          name: "Playing",
          value: "PLAYING",
        },
        {
          name: "Listening",
          value: "LISTENING",
        },
        {
          name: "Watching",
          value: "WATCHING",
        },
        {
          name: "Competing",
          value: "COMPETING",
        },
        {
          name: "Streaming",
          value: "STREAMING",
        },
      ],
    },
    {
      name: "presence",
      type: 3,
      description: "The presence of the bot",
      required: true,
    },
  ],
  async execute(interaction, args, bot) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "This command only works in servers.",
          ephemeral: true,
        });
      }

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

      const rawType = args[0];
      const presence = args[1];

      let type = null;
      switch (rawType) {
        case "PLAYING":
          type = ActivityType.Game;
          break;
        case "LISTENING":
          type = ActivityType.Listening;
          break;
        case "WATCHING":
          type = ActivityType.Watching;
          break;
        case "COMPETING":
          type = ActivityType.Competing;
          break;
        case "STREAMING":
          type = ActivityType.Streaming;
          break;
        default:
          type = null;
          break;
      }

      if (!type) {
        await interaction.reply(
          "Invalid presence type! Please select a valid presence type.",
        );
        return;
      }

      // Set the bot's presence with the specified type and presence
      bot.user.setPresence({
        activities: [{ name: presence, type: type }],
      });

      await interaction.reply(
        `Bot presence set to ${rawType.toLowerCase()} ${presence}`,
      );
    } catch (e) {
      console.error(e);
      await interaction.reply(
        "There was an error while executing this command!",
      );
    }
  },
};
