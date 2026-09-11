const { EmbedBuilder, PermissionsBitField } = require('discord.js');

async function handleDump(message, args) {
  // ✅ ADMIN OR OWNER LANG
  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const isOwner = message.guild.ownerId === message.author.id;
  if (!isAdmin && !isOwner) {
    return message.reply("<a:wrong1:1539239292394803311> Only Administrators and Server Owner can use this command.");
  }

  // ✅ KUNIN YUNG MENTIONED ROLE
  const role = message.mentions.roles.first();
  if (!role) {
    return message.reply("<:notebook:1547954441649389664> Please mention a role. Usage: `,dump @Role`");
  }

  // ✅ KUNIN LAHAT NG MAY ROLE NA ITO
  const membersWithRole = role.members;
  const count = membersWithRole.size;

  // ✅ BUUIN LISTAHAN NG MGA USER
  let userList = '';
  if (count === 0) {
    userList = 'No users found with this role.';
  } else {
    userList = membersWithRole.map(m => `<@${m.user.id}>`).join('\n');
  }

  // ✅ EMBED — WHITE, BLACECITY $ ON TOP, TAMA NA FORMAT
  const embed = new EmbedBuilder()
    .setColor('#FFFFFF')
    .setDescription(`**BlazeCity $ on top**

<:purple_arrow:1547823360157687900> **Role:** ${role}
<:purple_arrow:1547823360157687900> **Count:** ${count}
<:purple_arrow:1547823360157687900> **Users:**
${userList}
`);

  return message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false, roles: [] }
  });
}

// ✅ TAMA NA EXPORT — ITO ANG KULANG KANINA!
module.exports = { handleDump };