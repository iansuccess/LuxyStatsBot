const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN
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
  
  // ✅ PURONG CUSTOM STATUS — WALANG PREFIX NA "Watching / Playing"
  client.user.setPresence({
    activities: [{
      name: 'BlazeCity Always On my mind!', // ← DITO MO PALITAN ANG STATUS
      type: 4, // ⚠️ TYPE 4 = CUSTOM STATUS
      state: 'BlazeCity Always On my mind!' // ← KOPYAHIN MO RIN DITO
    }],
    status: 'dnd' // online / idle / dnd / invisible
  });
});

const activeVC = new Map(); // Track users currently in VC

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
    db.prepare('INSERT INTO users (user_id, guild_id, message_count, voice_seconds) VALUES (?, ?, 0, 0)').run(userId, guildId);
    row = { user_id: userId, guild_id: guildId, message_count: 0, voice_seconds: 0 };
  }
  return row;
}

// ---- Message Count ----
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
      .setColor('#2b2d31')
      .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
      .setDescription(`
<a:stats:1544039574890619032> **User Stats**
⤷ **Username:** ${target.username}
⤷ **Chat Count:** ${user.message_count}
⤷ **Voice Time:** ${formatTime(user.voice_seconds)}
      `);
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }

        // ,lb command
    if (cmd === 'lb' || cmd === 'leaderboard') {
      const allUsers = db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY message_count DESC').all(message.guild.id);
      const perPage = 3;
      const maxUsers = 15;
      const data = allUsers.slice(0, maxUsers);
      const totalPages = Math.ceil(data.length / perPage) || 1;

      const getMedal = (rank) => {
        if (rank === 1) return '<a:who_top:1544048934576726057>';
        if (rank === 2) return '<a:top2:1544048773821366402>';
        if (rank === 3) return '<a:top3:1544049019309924382>';
        return '🏅';
      };

      const generateEmbed = async (page) => {
        const start = (page - 1) * perPage;
        const pageData = data.slice(start, start + perPage);
        let desc = '';
        desc += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

        // ✅ I-FETCH NATIN LAHAT NG USER PARA HINDI "Unknown User"
        for (let i = 0; i < pageData.length; i++) {
          const u = pageData[i];
          const rankNum = start + i + 1;
          
          let uTag;
          try {
            // Subukan muna sa cache, kung wala → i-fetch mula sa server
            const cached = client.users.cache.get(u.user_id);
            if (cached) {
              uTag = cached.username;
            } else {
              const member = await message.guild.members.fetch(u.user_id);
              uTag = member.user.username;
            }
          } catch {
            uTag = `User ID: ${u.user_id.slice(0, 8)}...`; // Kung wala talaga, ID na lang
          }

          desc += `${getMedal(rankNum)} **#${rankNum}** │ ${uTag}\n`;
          desc += `   ⤷ 💬 ${u.message_count} messages • 🎤 ${formatTime(u.voice_seconds)} VC\n\n`;
        }
        desc += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

        return new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: '🏆 Server Leaderboard ' })
          .setDescription(desc || 'No data ....')
          .setFooter({ text: `📄 Page ${page} / ${totalPages} | Top ${maxUsers}` })
          .setTimestamp();
      };

      const buildButtons = (page) => {
        const row = new ActionRowBuilder();
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages)
        );
        return row;
      };

      // ✅ Kailangan ng async para makagamit ng fetch
      const msg = await message.reply({
        embeds: [await generateEmbed(1)],
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
          embeds: [await generateEmbed(currentPage)],
          components: [buildButtons(currentPage)]
        });
      });
    }
});

// ---- Voice State Tracking ----
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const userId = newState.member.id;
  const guildId = newState.guild.id;

  // Joined VC
  if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
    activeVC.set(userId + guildId, Date.now());
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  }

  // Left VC or moved to non-VC
  if (oldState.channelId && !newState.channelId && !newState.member.user.bot) {
    const joinedAt = activeVC.get(userId + guildId);
    if (joinedAt) {
      const seconds = Math.floor((Date.now() - joinedAt) / 1000);
      db.prepare('UPDATE users SET voice_seconds = voice_seconds + ? WHERE user_id = ? AND guild_id = ?').run(seconds, userId, guildId);
      activeVC.delete(userId + guildId);
    }
  }

  // Muted/deafened alone — keep counting
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