const { PrismaClient } = require("@prisma/client");
const { Rettiwt } = require("rettiwt-api");
const { users, tweetPolling, adminUser } = require("../config.json");
const { EmbedBuilder } = require("discord.js");

const _prisma = new PrismaClient();
let _rettiwt = null;

let _lastId = null;
let _lastDate = null;

let _interval = null;

const vm = {
  name: "XService",
  methods: {
    async getActiveToken() {
      return _prisma.tokens.findFirst({
        where: {
          is_active: true,
        },
      });
    },
    async getChannel(bot) {
      const channels = await _prisma.channel.findMany();
      if (!channels || channels.length === 0) {
        return "NO_CHANNEL";
      } else if (channels.length > 1) {
        return "TOO_MANY_CHANNELS";
      } else {
        return bot.channels.cache.get(channels[0].channel_id);
      }
    },
    transformTweetToEmbeds(tweet) {
      const mainUrl = `https://x.com/${tweet.tweetBy.userName}/status/${tweet.id}`;
      const embeds = [];

      const mainEmbed = new EmbedBuilder()
        .setTitle(
          `${tweet.tweetBy.fullName} (@${tweet.tweetBy.userName}) posted a new tweet!`,
        )
        .setURL(mainUrl)
        .setAuthor({
          name: tweet.tweetBy.fullName,
          iconURL: tweet.tweetBy.profileImage,
          url: mainUrl,
        })
        .setDescription(tweet.fullText)
        .setTimestamp(new Date(tweet.createdAt));

      if (tweet.media.length) {
        mainEmbed.setImage(tweet.media[0].url);
        // remove the first media as it's already set as the main image
        tweet.media.shift();
      }

      const mediaEmbeds = tweet.media.map((media) =>
        new EmbedBuilder().setURL(mainUrl).setImage(media.url),
      );

      embeds.push(mainEmbed, ...mediaEmbeds);

      return embeds;
    },
    validateInfo(token, channel) {
      if (!token) {
        console.error(
          "No active token found in the database. Please set a token.",
        );
        return false;
      }

      if (channel === "TOO_MANY_CHANNELS") {
        console.error(
          "Too many channels found in the database. Please remove all but one channel.",
        );
        return false;
      }

      if (channel === "NO_CHANNEL") {
        console.error(
          "No channel found in the database. Please set a channel.",
        );
        return false;
      }
      return true;
    },
    async search(filter, channel) {
      try {
        filter.startDate =
          _lastDate !== null ? _lastDate : new Date(Date.now() - 60 * 1000);

        if (_lastId) {
          filter.sinceId = _lastId;
        }

        const cursor = await _rettiwt.tweet
          .search(filter)
          .catch((err) => console.error(err));

        const tweets = cursor.list;
        if (!tweets || tweets.length === 0) {
          _lastDate = new Date();
          return;
        }

        for (const tweet of tweets) {
          if (tweet.quoted) {
            continue;
          }

          const embeds = vm.methods.transformTweetToEmbeds(tweet);
          channel.send({ embeds: embeds });
        }

        const lastTweet = tweets[tweets.length - 1];
        _lastId = lastTweet.id;
        _lastDate = new Date();
      } catch (e) {
        throw e;
      }
    },
    async sendErrorToAdmin(bot, error) {
      // send a message to the admin user with the error and stack trace
      const admin = await bot.users.fetch(adminUser);
      const message = `An error occurred in the XService: \`${error.message}\`\n\`\`\`${error.stack}\`\`\``;
      await admin.send(message);
    },
  },
  async execute(bot) {
    if (!bot) {
      console.error("Bot is not defined.");
      return;
    }

    const token = await this.methods.getActiveToken();
    const channel = await this.methods.getChannel(bot);

    if (!this.methods.validateInfo(token, channel)) {
      console.error("Invalid token or channel information.");
      return;
    }

    _rettiwt = new Rettiwt({ apiKey: token.token });

    try {
      console.log("Starting to listen to tweets...");
      const polling = tweetPolling;

      const debugInterval = true;
      const checkInterval = 5000;

      while (true) {
        let timer = polling;

        // Start a loop to count down the timer
        while (timer > 0) {
          // Log remaining time every 5 seconds
          if (timer % checkInterval === 0 && debugInterval) {
            console.log(
              `Polling in ${timer / 1000} seconds... ${_lastDate} / ${_lastId}`,
            );
          }

          // Wait for 1 second
          await new Promise((resolve) => setTimeout(resolve, 1000));
          timer -= 1000; // Decrease timer by 1 second
        }

        // After timer reaches 0, execute the search
        console.log("Polling for tweets...");
        await this.methods
          .search({ fromUsers: users, replies: false }, channel)
          .catch((err) => {
            console.error("Error during search:", err);
            this.methods.sendErrorToAdmin(bot, err);
          });
      }
    } catch (err) {
      console.error("Error during execution:", err);
      await this.methods.sendErrorToAdmin(bot, err);
    }
  },
};

module.exports = vm;
