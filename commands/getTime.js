const xService = require("../services/XService");
const { PermissionsBitField } = require("discord.js");
const { adminUser } = require("../config.json");

module.exports = {
  name: "timeleft",
  description: "Get the seconds left until the next tweet polling",
  ephemeral: true,
  async execute(interaction, args, bot) {
    try {
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

      // timeLeft returns the time left in milliseconds
      const timeLeft = xService.methods.getTimeLeft();
      const secondsLeft = Math.floor(timeLeft / 1000);

      const nextPollingDate = new Date(Date.now() + timeLeft);
      let message = `Time left until the next tweet polling: ${secondsLeft} seconds\nNext polling date: <t:${nextPollingDate.getTime()}:T>`;

      const lastDate = xService.methods.getPreviousIntervalDate();

      if (lastDate) {
        message += `Last polling date: <t:${lastDate.getTime()}:T>\n`;
      }

      await interaction.reply({
        content: message,
        ephemeral: true,
      });
    } catch (e) {
      console.error(e);
      return interaction.reply({
        content: "An error occurred while trying to get the time left.",
        ephemeral: true,
      });
    }
  },
};
