const { ApplicationCommandType, ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(bot) {
    console.log(
      `${bot.user.username} is online on ${bot.guilds.cache.size} servers!`,
    );

    bot.user.setPresence({
      activities: [{ name: "Stranger Things 5", type: ActivityType.Watching }],
    });

    if (!bot.application?.owner) await bot.application?.fetch();

    const commands = await bot.application?.commands.fetch();

    await bot.commands.forEach(async (command) => {
      if (!command.name || !command.description) {
        console.error(
          `Command ${command.name} is missing required fields! Skipping...`,
          command,
        );
        return;
      }

      const sourcecmd = commands.find((c) => c.name === command.name);
      const opt =
        sourcecmd &&
        command.options &&
        `${JSON.stringify(sourcecmd.options)}` ===
          `${JSON.stringify(command.options)}`;

      if (
        (opt || opt === undefined) &&
        sourcecmd &&
        command.description === sourcecmd.description
      )
        return;

      if (sourcecmd && command.type) return;

      console.log(
        `Detected /${command.name} has some changes! Overwriting command...`,
      );

      try {
        await bot.application?.commands.create(
          {
            name: command.name,
            type: command.type
              ? ApplicationCommandType[command.type]
              : ApplicationCommandType.ChatInput,
            description: command.description,
            options: command.options || [], // Ensure options exist
            default_member_permissions: command.default_member_permissions
              ? command.default_member_permissions
              : null,
          },
          command.limited ? command.guildId : null,
        );
      } catch (error) {
        console.error(
          `Error creating/updating command ${command.name}:`,
          error,
        );
      }
    });

    await commands.forEach(async (command) => {
      if (bot.commands.find((c) => c.name === command.name)) return;
      await command.delete();
    });
  },
};
