const { PrismaClient } = require("@prisma/client");
const { Rettiwt } = require("rettiwt-api");
const {
  users,
  tweetPollingStart,
  tweetPollingEnd,
  tweetPollingDebug,
  adminUser,
  proxyUrl,
} = require("../config.json");
const {
  EmbedBuilder,
  shouldUseGlobalFetchAndWebSocket,
} = require("discord.js");

const _prisma = new PrismaClient();
let _rettiwt = null;

let _lastId = null;
let _lastDate = null;

let _interval = null;
let _timer = null;

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
    generateNewPollingInterval() {
      let x = Math.floor(
        Math.random() * (tweetPollingEnd - tweetPollingStart) +
          tweetPollingStart,
      );
      // round it to the nearest second
      x = Math.round(x / 1000) * 1000;
      return x;
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

        if (!cursor) {
          return new Error(
            "No cursor returned from search. Is the token valid?",
          );
        }

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
    getTimeLeft() {
      return _timer;
    },
    getPreviousIntervalDate() {
      return _lastDate;
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

    let token = await this.methods.getActiveToken();
    let channel = await this.methods.getChannel(bot);

    if (!this.methods.validateInfo(token, channel)) {
      console.error("Invalid token or channel information.");
      return;
    }

    const config = { apiKey: token.token, logging: true };
    if (proxyUrl && proxyUrl.length > 0) {
      config.proxyUrl = proxyUrl;
      console.log(`Using proxy URL: ${proxyUrl}`);
    }

    try {
      console.log("Starting to listen to tweets...");
      _interval = vm.methods.generateNewPollingInterval();

      const debugInterval = true;

      while (true) {
        _timer = _interval;

        if (tweetPollingDebug) {
          _timer = tweetPollingDebug;
        }

        // Start a loop to count down the _timer
        while (_timer > 0) {
          // Log remaining time every 5 seconds
          if (_timer % 5000 === 0 && debugInterval) {
            console.log(
              `Polling in ${_timer / 1000} seconds... ${_lastDate} / ${_lastId}`,
            );
          }

          // Wait for 1 second
          await new Promise((resolve) => setTimeout(resolve, 1000));
          _timer -= 1000; // Decrease _timer by 1 second
        }

        const newToken = await vm.methods.getActiveToken();
        const newChannel = await vm.methods.getChannel(bot);

        if (
          newToken.token !== token.token ||
          newChannel.channel_id !== channel.channel_id
        ) {
          console.log("Token or channel has changed.");
          if (this.methods.validateInfo(newToken, newChannel)) {
            config.apiKey = newToken.token;
            channel = newChannel;
          } else {
            console.error(
              "Invalid new token or channel information, reverting to old token and channel.",
            );
          }
        }

        _rettiwt = new Rettiwt(config);

        // After _timer reaches 0, execute the search
        console.log("Polling for tweets...");

        _interval = vm.methods.generateNewPollingInterval();

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
