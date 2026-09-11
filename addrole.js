const { PermissionsBitField, EmbedBuilder } = require('discord.js');

async function handleAddRole(message, args) {
  // ✅ Admin o Owner lang pwede
  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const isOwner = message.guild.ownerId === message.author.id;

  // ❌ KUNG HINDI ADMIN — ITO ANG LALABAS
  if (!isAdmin && !isOwner) {
    return message.reply('<a:wrong1:1539239292394803311> You need admin permissions to create roles or use this command.');
  }

  // ✅ ,addrole color — Color Guide
  if (args[0] === 'color') {
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setTitle('🎨 Color Guide')
      .setDescription(`<:purple_arrow:1547823360157687900> Use ANY HEX color code!
<:purple_arrow:1547823360157687900> Format: \`RRGGBB\` or \`#RRGGBB\`
<:purple_arrow:1547823360157687900> Example: \`FF0000\` = Red
<:purple_arrow:1547823360157687900> Example: \`00FF00\` = Green
<:purple_arrow:1547823360157687900> ANY hex works — NO LIMIT!`);
    return message.reply({ embeds: [embed] });
  }

  // ✅ KUNG ,addrole LANG — WALANG ARGUMENTS — MAY NOTE NA LALABAS
  if (args.length === 0) {
    return message.reply('<:notebook:1547954441649389664> use hex for coloring the roles.');
  }

  // ✅ AYUSIN: LAHAT BUKOD SA HULI = ROLE NAME (KAHIT MAY SPACE)
  // ✅ HULI LANG = COLOR
  let roleName, colorInput;
  if (args.length === 1) {
    roleName = args[0];
    colorInput = null;
  } else {
    colorInput = args.pop(); // HULI = COLOR
    roleName = args.join(' '); // LAHAT NA NATIRA = ROLE NAME (KASAMA SPACE)
  }

  try {
    // ✅ WALANG KULAY = DEFAULT NA NG DISCORD
    const roleOptions = {
      name: roleName,
      permissions: [],
      reason: `Created by ${message.author.tag}`
    };

    let colorDisplay = 'Default';

    // ✅ KUNG MAY KULAY — I-CHECK, PERO KAPAG MALI → DEFAULT NA LANG
    if (colorInput) {
      let processedColor = colorInput.toLowerCase();
      if (!processedColor.startsWith('#')) processedColor = '#' + processedColor;
      const validHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(processedColor);

      if (validHex) {
        roleOptions.color = processedColor;
        colorDisplay = processedColor;
      }
    }

    // ✅ GUMAGAWA NG ROLE — PALAGI! WALANG INVALID ERROR!
    const newRole = await message.guild.roles.create(roleOptions);

    // ✅ SUCCESS MESSAGE
    return message.reply(`<a:verify:1539238356003848344> role created
<:purple_arrow:1547823360157687900> creator: ${message.author}
<:purple_arrow:1547823360157687900> role name: **${newRole.name}**
<:purple_arrow:1547823360157687900> role color: \`${colorDisplay}\``);

  } catch (err) {
    console.error(err);
    return message.reply('<a:wrong1:1539239292394803311> Failed to create role. Check my permissions & role position.');
  }
}

module.exports = { handleAddRole };