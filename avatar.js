// avatar.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  // ✅ COMMAND: ,av
  async handleAvatar(message) {
    // Alamin kung sino ang target:
    // 1. Kung may mention → yung minention
    // 2. Kung may reply → yung ni-replyan
    // 3. Kung wala → yung nag-command
    let target = message.mentions.users.first();

    if (!target && message.reference) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        target = repliedMsg.author;
      } catch {
        target = null;
      }
    }

    if (!target) {
      target = message.author;
    }

    // ✅ WALANG EMBED — plain text lang, lalabas ang avatar URL
    const avatarURL = target.displayAvatarURL({ size: 4096, dynamic: true });
    return message.reply({
      content: avatarURL,
      allowedMentions: { repliedUser: false }
    });
  },

  // ✅ COMMAND: ,banner
  async handleBanner(message) {
    // Alamin kung sino ang target:
    // 1. Kung may mention → yung minention
    // 2. Kung may reply → yung ni-replyan
    // 3. Kung wala → yung nag-command
    let target = message.mentions.users.first();

    if (!target && message.reference) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        target = repliedMsg.author;
      } catch {
        target = null;
      }
    }

    if (!target) {
      target = message.author;
    }

    // ✅ Kuhanin ang banner ng user
    const user = await message.client.users.fetch(target.id, { force: true });
    const bannerURL = user.bannerURL({ size: 4096, dynamic: true });

    // ✅ WALANG EMBED — plain text lang
    if (!bannerURL) {
      return message.reply({
        content: `⚠️ Walang banner si **${target.username}**.`,
        allowedMentions: { repliedUser: false }
      });
    }

    return message.reply({
      content: bannerURL,
      allowedMentions: { repliedUser: false }
    });
  }
};