// list.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ---- Storage file ----
const DATA_FILE = path.join(__dirname, 'list_data.json');

// ---- 🔒 BOT OWNER ID ----
const BOT_OWNER_ID = '1531611262159687820';

// ---- Default data ----
function defaultData() {
  return {
    lists: {},
    message: 'BlazeCity List'
  };
}

// ---- Load / Save ----
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        lists: parsed.lists || {},
        message: parsed.message || 'BlazeCity List'
      };
    }
  } catch (e) {
    console.error('list.js load error:', e);
  }
  return defaultData();
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('list.js save error:', e);
  }
}

// ---- Emoji strip ----
const HEADER_EMOJIS = '<a:777153620596490321:1548997041554849802><a:777154141398106133:1548997020121825391><a:777153546068033536:1548997053441646632><a:777154311515275265:1548996408500158527><a:7771539581530275941:1548996675043987547><a:777153661817061377:1548996202639523880><a:777154049342439474:1548997063071629422><a:777154423831003166:1548996705595433031><a:777154477681278978:1548997030540611665>';
const ARROW = '<:purple_arrow:1547823360157687900>';

// ---- Helpers ----
function isImageLink(str) {
  if (!str) return false;
  return /^https?:\/\/.+\.(png|jpe?g|gif|webp|bmp|tiff?|svg|avif)(\?.*)?$/i.test(str.trim());
}

// 🔒 Bot Owner only
function isBotOwner(message) {
  return message.author.id === BOT_OWNER_ID;
}

function getGuildList(data, guildId) {
  if (!data.lists[guildId]) {
    data.lists[guildId] = { items: [], thumbnail: null, image: null };
  }
  if (data.lists[guildId].icon && !data.lists[guildId].thumbnail) {
    data.lists[guildId].thumbnail = data.lists[guildId].icon;
    delete data.lists[guildId].icon;
  }
  if (!data.lists[guildId].thumbnail) data.lists[guildId].thumbnail = null;
  if (!data.lists[guildId].image) data.lists[guildId].image = null;
  return data.lists[guildId];
}

// ---- Main handler ----
async function handleList(message, args, client) {
  if (!isBotOwner(message)) {
    return message.reply({
      content: '❌ Only the **Bot Owner** can use `,list`.',
      allowedMentions: { repliedUser: false }
    });
  }

  const sub = (args[0] || '').toLowerCase();
  const data = loadData();
  const guildList = getGuildList(data, message.guild.id);

  // ---------- ,list (show) ----------
  if (!sub || sub === 'show' || sub === 'view') {
    const embed = new EmbedBuilder().setColor('#FFFFFF');

    embed.setTitle(data.message || 'BlazeCity List');

    if (guildList.thumbnail) {
      embed.setThumbnail(guildList.thumbnail);
    }

    if (HEADER_EMOJIS) {
      embed.setDescription(HEADER_EMOJIS);
    }

    let listText = '';
    if (guildList.items.length === 0) {
      listText = '_The list is currently empty._';
    } else {
      listText = guildList.items
        .map(item => `${ARROW} \`${item}\``)
        .join('\n');
    }
    embed.addFields({ name: '\u200b', value: listText });

    if (guildList.image) {
      embed.setImage(guildList.image);
    }

    embed.setFooter({ text: 'BlazeCity luvs you :3' });
    embed.setTimestamp();

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }

  // ---------- ,list add <text> ----------
  if (sub === 'add') {
    const text = args.slice(1).join(' ').trim();
    if (!text) return message.reply('❌ Usage: `,list add <text>`');
    guildList.items.push(text);
    saveData(data);
    return message.reply(`✅ Added: \`${text}\``);
  }

  // ---------- ,list remove <index|text> ----------
  if (sub === 'remove' || sub === 'delete' || sub === 'del') {
    const target = args.slice(1).join(' ').trim();
    if (!target) return message.reply('❌ Usage: `,list remove <index|text>`');

    const idx = parseInt(target, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= guildList.items.length) {
      const removed = guildList.items.splice(idx - 1, 1)[0];
      saveData(data);
      return message.reply(`✅ Removed: \`${removed}\``);
    }

    const matchIdx = guildList.items.findIndex(i => i.toLowerCase() === target.toLowerCase());
    if (matchIdx !== -1) {
      const removed = guildList.items.splice(matchIdx, 1)[0];
      saveData(data);
      return message.reply(`✅ Removed: \`${removed}\``);
    }

    return message.reply('❌ Item not found.');
  }

  // ---------- ,list clear ----------
  if (sub === 'clear') {
    guildList.items = [];
    saveData(data);
    return message.reply('✅ List items cleared.');
  }

  // ---------- ,list thumbnail <url|off> ----------
  if (sub === 'thumbnail' || sub === 'thumb' || sub === 'icon') {
    const val = args.slice(1).join(' ').trim();
    if (!val) return message.reply('❌ Usage: `,list thumbnail <url|off>`');

    if (val.toLowerCase() === 'off' || val.toLowerCase() === 'none' || val.toLowerCase() === 'remove') {
      guildList.thumbnail = null;
      saveData(data);
      return message.reply('✅ Thumbnail removed.');
    }

    if (!isImageLink(val)) {
      return message.reply('❌ Invalid image link. Must be a direct image link (png/jpg/gif/etc).');
    }

    guildList.thumbnail = val;
    saveData(data);
    return message.reply(`✅ Thumbnail set: ${val}`);
  }

  // ---------- ,list image <url|off> ----------
  if (sub === 'image' || sub === 'img') {
    const val = args.slice(1).join(' ').trim();
    if (!val) return message.reply('❌ Usage: `,list image <url|off>`');

    if (val.toLowerCase() === 'off' || val.toLowerCase() === 'none' || val.toLowerCase() === 'remove') {
      guildList.image = null;
      saveData(data);
      return message.reply('✅ Image removed.');
    }

    if (!isImageLink(val)) {
      return message.reply('❌ Invalid image link. Must be a direct image link (png/jpg/gif/etc).');
    }

    guildList.image = val;
    saveData(data);
    return message.reply(`✅ Image set: ${val}`);
  }

  // ---------- ,list message <text> ----------
  if (sub === 'message' || sub === 'msg') {
    const text = args.slice(1).join(' ').trim();
    if (!text) return message.reply('❌ Usage: `,list message <text>`');
    data.message = text;
    saveData(data);
    return message.reply(`✅ Header message set: \`${text}\``);
  }

  // ---------- ,list help ----------
  if (sub === 'help') {
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setTitle('📋 List Commands — Quick Reference')
      .setDescription(
        '**🔹 View**\n' +
        `${ARROW} \`,list\` — Show the list\n` +
        `${ARROW} \`,list help\` — Show this help\n\n` +
        '**🔹 Add / Remove**\n' +
        `${ARROW} \`,list add <text>\` — Add an item\n` +
        `${ARROW} \`,list remove <index|text>\` — Remove an item\n` +
        `${ARROW} \`,list clear\` — Remove all items\n\n` +
        '**🔹 Images**\n' +
        `${ARROW} \`,list thumbnail <url|off>\` — Top-right thumbnail\n` +
        `${ARROW} \`,list image <url|off>\` — Bottom image\n\n` +
        '**🔹 Header**\n' +
        `${ARROW} \`,list message <text>\` — Set the header text`
      )
      .setFooter({ text: '🔒 Bot Owner only • BlazeCity luvs you :3' });
    return message.reply({ embeds: [embed] });
  }

  return message.reply('❌ Unknown subcommand. Try `,list help`');
}

module.exports = { handleList };