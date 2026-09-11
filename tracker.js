const { EmbedBuilder, PermissionsBitField } = require('discord.js');

async function handleWhois(message, args) {
  // ✅ KUNG MAY MENTION → YUNG MENTIONED USER
  // ✅ KUNG MAY REPLY → YUNG NIREPLYAN
  // ✅ KUNG WALA → SARILI
  let target;
  if (message.mentions.users.size > 0) {
    target = message.mentions.users.first();
  } else if (message.reference && message.reference.messageId) {
    try {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId);
      target = refMsg.author;
    } catch {
      target = message.author;
    }
  } else {
    target = message.author;
  }
  const member = message.guild.members.cache.get(target.id);
  if (!member) {
    return message.reply('<a:wrong1:1539239292394803311> User not found in this server.');
  }
  // ✅ BILANG NG ROLE — HUWAG ISAMA YUNG @everyone
  const roleCount = member.roles.cache.filter(r => r.id !== message.guild.id).size;
  // ✅ ADMIN CHECK
  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
  const adminStatus = isAdmin ? '<a:verify:1539238356003848344>' : '<a:wrong1:1539239292394803311>';
  // ✅ EMBED — PUTI, AVATAR SA GILID
  const embed = new EmbedBuilder()
    .setColor('#FFFFFF')
    .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
    .setDescription(`
\`blazecity $\` on top

<:purple_arrow:1547823360157687900> **User:** ${target.username}
<:purple_arrow:1547823360157687900> **Roles:** ${roleCount}
<:purple_arrow:1547823360157687900> **Admin:** ${adminStatus}
    `);
  return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

module.exports = { handleWhois };