const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { handleBackup, handleRestore } = require('./backup.js');
const { handleAvatar, handleBanner } = require('./avatar.js'); // ✅ BAGONG IMPORT


const TOKEN = process.env.TOKEN;
const PREFIX = ',';
const db = new Database('./stats.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    voice_seconds INTEGER DEFAULT 0,
    last_joined_vc INTEGER DEFAULT 0
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_guild ON users(user_id, guild_id);
`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// ---- BOT STATUS ----
client.on('ready', () => {
  console.log(`✅ Naka-login na bilang: ${client.user.tag}`);
  
  client.user.setPresence({
    activities: [{
      name: 'BlazeCity Always On my mind!',
      type: 4,
      state: 'BlazeCity Always On my mind!'
    }],
    status: 'dnd'
  });
});

const activeVC = new Map();

// ---- Format Time ----
function formatTime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let out = '';
  if (d > 0) out += `${d}d `;
  if (h > 0 || d > 0) out += `${h}h `;
  if (m > 0 || h > 0 || d > 0) out += `${m}m `;
  if (d === 0 && h === 0 && m === 0) out += `${s}s`;
  return out.trim() || '0m';
}

// ---- Get or Create User Data ----
function getUserData(userId, guildId) {
  let row = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, message_count, voice_seconds) VALUES (?, ?, 0, 0)').run(userId, guildId);
    row = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId) || 
          { user_id: userId, guild_id: guildId, message_count: 0, voice_seconds: 0 };
  }
  return row;
}

// ---- Message Count & Commands ----
client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) {
    const user = getUserData(message.author.id, message.guild.id);
    db.prepare('UPDATE users SET message_count = message_count + 1 WHERE user_id = ? AND guild_id = ?').run(message.author.id, message.guild.id);
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();

  // ,stats command
  if (cmd === 'stats') {
    const target = message.mentions.users.first() || message.author;
    const user = getUserData(target.id, message.guild.id);
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
      .setDescription(`
<a:stats:1544039574890619032> **User Stats**
⤷ **Username:** ${target.username}
⤷ **Chat Count:** ${user.message_count}
⤷ **Voice Time:** ${formatTime(user.voice_seconds)}
      `);
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }

  // ,av command
  if (cmd === 'av') {
    return handleAvatar(message);
  }

  // ,banner command
  if (cmd === 'banner') {
    return handleBanner(message);
  }

  // ,lb / ,leaderboard command
  if (cmd === 'lb' || cmd === 'leaderboard') {
    const allUsers = db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY message_count DESC').all(message.guild.id);
    const perPage = 3;
    const maxUsers = 15;
    const data = allUsers.slice(0, maxUsers);
    const totalPages = Math.ceil(data.length / perPage) || 1;

    // ✅ IMAGE BANNER — NASA TAAS
    const LB_HEADER_IMAGE = 'https://i.imgur.com/qAEUi5L.png';

    const getRankIcon = (rank) => {
      if (rank === 1) return '<a:who_top:1544048934576726057>';
      if (rank === 2) return '<a:top2:1544048773821366402>';
      if (rank === 3) return '<a:top3:1544049019309924382>';
      return '🏅';
    };

    // ✅ HEADER EMBED — IMAGE BANNER SA TAAS
    const buildHeaderEmbed = () => {
      return new EmbedBuilder()
        .setColor('#FFFFFF')
        .setImage(LB_HEADER_IMAGE);
    };

    // ✅ ISANG EMBED LANG — MAY AVATAR SA GILID GAMIT ANG MENTION
    const generateEmbed = async (page) => {
      const start = (page - 1) * perPage;
      const pageData = data.slice(start, start + perPage);
      let desc = '';

      for (let i = 0; i < pageData.length; i++) {
        const u = pageData[i];
        const rankNum = start + i + 1;

        // ✅ GAMITIN ANG MENTION PARA LUMABAS ANG AVATAR SA GILID
        const mention = `<@${u.user_id}>`;

        desc += `${getRankIcon(rankNum)} **#${rankNum}** │ ${mention}\n`;
        desc += `   <:purple_arrow:1547823360157687900> ${u.message_count} messages • <:white_voice:1547823928142209044> ${formatTime(u.voice_seconds)} VC\n\n`;
      }

      return new EmbedBuilder()
        .setColor('#FFFFFF') // ✅ PUTING BOX
        .setDescription(desc || 'No data ....')
        .setFooter({ text: `📄 Page ${page} / ${totalPages} | Top ${maxUsers}` })
        .setTimestamp();
    };

    // ✅ BUTTONS — PUTI
    const buildButtons = (page) => {
      const row = new ActionRowBuilder();
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages)
      );
      return row;
    };

    // ✅ PADALA: IMAGE BANNER → ISANG MALINIS NA BOX → BUTTONS
    const msg = await message.reply({
      embeds: [buildHeaderEmbed(), await generateEmbed(1)],
      components: [buildButtons(1)],
      allowedMentions: { repliedUser: false }
    });

    const collector = msg.createMessageComponentCollector({ time: 120_000 });
    const pages = new Map();
    pages.set(msg.author.id, 1);

    collector.on('collect', async i => {
      let currentPage = pages.get(i.user.id) || 1;
      if (i.customId === 'prev') currentPage = Math.max(1, currentPage - 1);
      if (i.customId === 'next') currentPage = Math.min(totalPages, currentPage + 1);
      pages.set(i.user.id, currentPage);

      i.update({
        embeds: [buildHeaderEmbed(), await generateEmbed(currentPage)],
        components: [buildButtons(currentPage)]
      });
    });
  }

  // ,backup command
  if (cmd === 'backup') {
    return handleBackup(message, args, client);
  }
  // ,restore command
  if (cmd === 'restore') {
    return handleRestore(message, args, client);
  }
});

// ---- Voice State Tracking ----
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const userId = newState.member.id;
  const guildId = newState.guild.id;

  if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
    activeVC.set(userId + guildId, Date.now());
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  }

  if (oldState.channelId && !newState.channelId && !newState.member.user.bot) {
    const joinedAt = activeVC.get(userId + guildId);
    if (joinedAt) {
      const seconds = Math.floor((Date.now() - joinedAt) / 1000);
      db.prepare('UPDATE users SET voice_seconds = voice_seconds + ? WHERE user_id = ? AND guild_id = ?').run(seconds, userId, guildId);
      activeVC.delete(userId + guildId);
    }
  }

  if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) return;
});

// Save active VC times on bot restart/shutdown
function saveActiveVC() {
  for (const [key, joinedAt] of activeVC) {
    const [userId, guildId] = key.split(/(?<=\d{17,})/);
    if (userId && guildId) {
      const seconds = Math.floor((Date.now() - joinedAt) / 1000);
      db.prepare('UPDATE users SET voice_seconds = voice_seconds + ? WHERE user_id = ? AND guild_id = ?').run(seconds, userId, guildId);
    }
  }
  activeVC.clear();
}

process.on('SIGINT', () => { saveActiveVC(); process.exit(0); });
process.on('SIGTERM', () => { saveActiveVC(); process.exit(0); });

client.login(TOKEN);
console.log('✅ Stats Bot Running...');