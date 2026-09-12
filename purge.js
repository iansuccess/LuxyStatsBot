const { ChannelType } = require('discord.js');
const DEFAULT_PURGE = 20;
const MAX_PURGE = 500;
const MAX_PAGES = 50;

module.exports = {
  async execute(message, args) {
    return handlePurge(message, args);
  }
};

async function handlePurge(message, args) {
  // OWNER ONLY — NO REPLY TO OTHERS
  if (message.guild.ownerId !== message.author.id) return;

  let targetId = null;
  let amount = DEFAULT_PURGE;

  // PARSE ARGUMENTS
  if (args.length >= 1) {
    const firstArg = args[0];
    // MENTION: @User or @!User
    const mentionMatch = firstArg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      targetId = mentionMatch[1];
      if (args.length >= 2 && /^\d+$/.test(args[1])) {
        amount = parseInt(args[1]);
      }
    }
    // DIRECT USER ID: 15-20 digits
    else if (/^\d{15,20}$/.test(firstArg)) {
      targetId = firstArg;
      if (args.length >= 2 && /^\d+$/.test(args[1])) {
        amount = parseInt(args[1]);
      }
    }
    // ONLY AMOUNT, NO TARGET
    else if (/^\d+$/.test(firstArg)) {
      amount = parseInt(firstArg);
    }
  }

  amount = Math.max(1, Math.min(amount, MAX_PURGE));

  // DELETE ONLY IN CURRENT CHANNEL — SILENT
  await purgeChannel(message.channel, amount, targetId);
  return;
}

async function purgeChannel(channel, limit, userId) {
  try {
    let deletedTotal = 0;
    let lastId = null;
    let pages = 0;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    while (deletedTotal < limit && pages < MAX_PAGES) {
      pages++;
      const messages = await channel.messages.fetch({
        limit: 100,
        before: lastId ?? undefined
      }).catch(() => null);

      if (!messages || messages.size === 0) break;
      lastId = messages.last().id;

      // ✅ FILTER FIRST — BEFORE ANY SLICING
      let filtered;
      if (userId) {
        // ONLY MESSAGES FROM TARGET USER
        filtered = messages.filter(m => m.author.id === userId);
      } else {
        // ALL MESSAGES
        filtered = messages;
      }

      if (filtered.size === 0) {
        if (!userId) break;
        continue;
      }

      // ✅ SLICE ONLY AFTER FILTERING — NO MORE ERROR
      const need = limit - deletedTotal;
      let toDeleteArr = [...filtered.values()];
      if (toDeleteArr.length > need) {
        toDeleteArr = toDeleteArr.slice(0, need);
      }

      // SEPARATE RECENT vs OLD
      const recentArr = toDeleteArr.filter(m => m.createdTimestamp > twoWeeksAgo);
      const oldArr = toDeleteArr.filter(m => m.createdTimestamp <= twoWeeksAgo);

      // BULK DELETE RECENT MESSAGES
      if (recentArr.length >= 2) {
        const del = await channel.bulkDelete(recentArr, true).catch(() => null);
        if (del) deletedTotal += del.size;
      } else if (recentArr.length === 1) {
        const ok = await recentArr[0].delete().catch(() => null);
        if (ok) deletedTotal++;
      }

      // DELETE OLD MESSAGES ONE BY ONE
      const OLD_DELETE_CONCURRENCY = 3;
      for (let i = 0; i < oldArr.length; i += OLD_DELETE_CONCURRENCY) {
        if (deletedTotal >= limit) break;
        const chunk = oldArr.slice(i, i + OLD_DELETE_CONCURRENCY);
        const results = await Promise.all(
          chunk.map(msg => msg.delete().then(() => true).catch(() => false))
        );
        deletedTotal += results.filter(Boolean).length;
      }

      if (!userId) break;
      if (deletedTotal >= limit) break;
    }
    return deletedTotal;
  } catch (err) {
    console.log(`Error in ${channel.name}: ${err.message}`);
    return 0;
  }
}

module.exports.handlePurge = handlePurge;