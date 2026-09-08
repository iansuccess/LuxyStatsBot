const { PermissionsBitField, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const PREFIX = ',';
const BACKUP_FOLDER = path.join(__dirname, 'backups');
const MAX_MESSAGES_PER_CHANNEL = 100;
const WHITE = 16777215;

// ================= OWNER ID =================
const BOT_OWNER_ID = '1531611262159687820';
// ============================================

if (!fs.existsSync(BACKUP_FOLDER)) fs.mkdirSync(BACKUP_FOLDER);

function getPerms(perms) {
    return perms.toArray();
}

function isOwner(userId) {
    return userId === BOT_OWNER_ID;
}

// ---------------- ,backup ----------------
// ✅ KUKUHAIN ANG DATA MULA SA SERVER KUNG SAAN KA NAG-COMMAND!
async function handleBackup(message, args, client) {
    if (!isOwner(message.author.id)) {
        return message.reply({ embeds: [new EmbedBuilder()
            .setDescription('<a:wrong1:1546809103702167642> **Access Denied** — Only the Bot Owner can use this command.')
            .setColor(WHITE)]
        });
    }

    // ✅ KUNG SAAN KA NAG-COMMAND — DUN KUKUHAIN ANG BACKUP!
    const sourceGuild = message.guild;
    const serverId = sourceGuild.id;

    const waitMsg = await message.reply({ embeds: [new EmbedBuilder()
        .setDescription(`🔍 **SCANNING SERVER...**\n🆔 Server ID: \`${serverId}\`\n📋 Server Name: **${sourceGuild.name}**\n\nScanning Roles • Categories • Channels • Messages...`)
        .setColor(WHITE)]
    });

    try {
        // SCAN ROLES
        const rolesData = [];
        sourceGuild.roles.cache.sort((a, b) => b.position - a.position).forEach(r => {
            if (r.name !== '@everyone') {
                rolesData.push({
                    name: r.name,
                    color: r.color,
                    hoist: r.hoist,
                    position: r.position,
                    permissions: getPerms(r.permissions),
                    mentionable: r.mentionable
                });
            }
        });

        // SCAN CATEGORIES + TEXT + VOICE
        const categories = [];
        const textChannels = [];
        const voiceChannels = [];
        const allCategories = sourceGuild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);

        for (const cat of allCategories.values()) {
            const catData = { name: cat.name, position: cat.position, children: [] };

            // TEXT CHANNELS
            const catTextChannels = sourceGuild.channels.cache.filter(c => c.type === ChannelType.GuildText && c.parentId === cat.id).sort((a, b) => a.position - b.position);
            for (const ch of catTextChannels.values()) {
                let messages = [];
                try {
                    const msgs = await ch.messages.fetch({ limit: MAX_MESSAGES_PER_CHANNEL });
                    msgs.forEach(m => {
                        if (!m.author.bot) messages.push({
                            author: { username: m.author.username, avatar: m.author.displayAvatarURL({ extension: 'png' }) },
                            content: m.content,
                            timestamp: m.createdTimestamp
                        });
                    });
                } catch (e) {}

                catData.children.push({
                    name: ch.name,
                    type: 'text',
                    topic: ch.topic,
                    position: ch.position,
                    nsfw: ch.nsfw,
                    slowmode: ch.rateLimitPerUser,
                    permissionOverwrites: ch.permissionOverwrites.cache.map(p => ({
                        id: p.id,
                        type: p.type,
                        allow: getPerms(p.allow),
                        deny: getPerms(p.deny)
                    })),
                    messages: messages
                });
                textChannels.push(ch);
            }

            // VOICE CHANNELS
            const catVoiceChannels = sourceGuild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.parentId === cat.id).sort((a, b) => a.position - b.position);
            for (const ch of catVoiceChannels.values()) {
                catData.children.push({
                    name: ch.name,
                    type: 'voice',
                    position: ch.position,
                    bitrate: ch.bitrate,
                    userLimit: ch.userLimit,
                    permissionOverwrites: ch.permissionOverwrites.cache.map(p => ({
                        id: p.id,
                        type: p.type,
                        allow: getPerms(p.allow),
                        deny: getPerms(p.deny)
                    }))
                });
                voiceChannels.push(ch);
            }

            categories.push(catData);
        }

        // ✅ ISAVE GAMIT ANG SERVER ID BILANG PANGALAN
        const backupPath = path.join(BACKUP_FOLDER, `${serverId}.json`);
        const backupData = {
            backupId: serverId,
            originalServerId: serverId,
            originalServerName: sourceGuild.name,
            scannedAt: Date.now(),
            maxMessagesPerChannel: MAX_MESSAGES_PER_CHANNEL,
            roles: rolesData,
            categories: categories,
            totalRoles: rolesData.length,
            totalCategories: categories.length,
            totalTextChannels: textChannels.length,
            totalVoiceChannels: voiceChannels.length,
            totalChannels: textChannels.length + voiceChannels.length
        };

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

        await waitMsg.edit({ embeds: [new EmbedBuilder()
            .setTitle('<a:verify:1539238356003848344> BACKUP SAVED')
            .setColor(WHITE)
            .addFields(
                { name: '<a:idk:1546810329160228894> Backup ID', value: `\`${serverId}\``, inline: false },
                { name: '<a:datatext:1546809664308641832> Server Name', value: `**${sourceGuild.name}**`, inline: false },
                { name: '<a:BlueGemLock:1546811874295808020> Roles', value: `${rolesData.length}`, inline: true },
                { name: '<a:datatext:1546809664308641832> Categories', value: `${categories.length}`, inline: true },
                { name: '<a:iMessage:1546809280181706872> Text Channels', value: `${textChannels.length}`, inline: true },
                { name: '<a:voice:1546809362457165864> Voice Channels', value: `${voiceChannels.length}`, inline: true }
            )
            .setFooter({ text: `<a:verify:1539238356003848344> Saved: ${serverId}.json | Restore anytime with: ,restore` })
        ]});

    } catch (err) {
        console.error(err);
        try {
            await waitMsg.edit({ embeds: [new EmbedBuilder().setDescription(`<a:wrong1:1546809103702167642> Backup Failed!\nError: ${err.message}`).setColor(WHITE)] });
        } catch {}
    }
}

// ---------------- ,restore ----------------
// ✅ IBABALIK ANG BACKUP NG SERVER ID NA ITO — SA SERVER KUNG SAAN KA NAG-COMMAND!
async function handleRestore(message, args, client) {
    const reply = (text) => message.reply({ embeds: [new EmbedBuilder().setDescription(text).setColor(WHITE)] }).catch(() => {});

    if (!isOwner(message.author.id)) {
        return reply('<a:wrong1:1546809103702167642> **Access Denied** — Only the Bot Owner can use this command.');
    }

    // ✅ KUNIN ANG SERVER ID NG KASALUKUYANG SERVER — DUN AABASAHIN ANG BACKUP
    const targetGuild = message.guild;
    const backupId = targetGuild.id;

    const backupPath = path.join(BACKUP_FOLDER, `${backupId}.json`);
    if (!fs.existsSync(backupPath)) {
        return reply(`<a:wrong1:1546809103702167642> No Backup Found: \`${backupId}.json\`\nDo: ,backup first`);
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    await reply(`<a:Loadings:1546810838055391240> **LOADING BACKUP...**
<a:idk:1546810329160228894> Backup ID: \`${backupId}\`
<a:datatext:1546809664308641832> Backup From: **${backup.originalServerName}**
<a:Loadings:1546810838055391240> Restoring To: **${targetGuild.name}** ← DITO KA NAG-COMMAND!

⏳ Deleting old data • Restoring... Please wait...`);

    try {
        // ✅ BURAHIN LAHAT NG NASA KASALUKUYANG SERVER
        for (const ch of targetGuild.channels.cache.values()) await ch.delete().catch(() => {});
        for (const r of targetGuild.roles.cache.filter(x => x.name !== '@everyone').values()) await r.delete().catch(() => {});

        // ✅ I-RECREATE LAHAT NG ROLES MULA SA BACKUP
        for (const r of backup.roles) {
            await targetGuild.roles.create({
                name: r.name,
                color: r.color,
                hoist: r.hoist,
                permissions: new PermissionsBitField(r.permissions),
                mentionable: r.mentionable,
                reason: 'Restore from Backup'
            });
        }

        // ✅ I-RECREATE LAHAT NG CATEGORIES AT CHANNELS MULA SA BACKUP
        for (const cat of backup.categories) {
            const newCat = await targetGuild.channels.create({ 
                name: cat.name, 
                type: ChannelType.GuildCategory, 
                position: cat.position 
            });

            for (const ch of cat.children) {
                if (ch.type === 'text') {
                    const newCh = await targetGuild.channels.create({
                        name: ch.name,
                        type: ChannelType.GuildText,
                        parent: newCat,
                        position: ch.position,
                        topic: ch.topic || null,
                        nsfw: ch.nsfw || false,
                        rateLimitPerUser: ch.slowmode || 0
                    });

                    // RESTORE MESSAGES VIA WEBHOOK
                    if (ch.messages && ch.messages.length > 0) {
                        try {
                            const webhook = await newCh.createWebhook({ name: 'Restore' });
                            for (const m of ch.messages.reverse()) {
                                await webhook.send({
                                    username: m.author.username,
                                    avatarURL: m.author.avatar,
                                    content: m.content
                                }).catch(() => {});
                            }
                            await webhook.delete().catch(() => {});
                        } catch (e) {}
                    }
                } else if (ch.type === 'voice') {
                    await targetGuild.channels.create({
                        name: ch.name,
                        type: ChannelType.GuildVoice,
                        parent: newCat,
                        position: ch.position,
                        bitrate: ch.bitrate || 64000,
                        userLimit: ch.userLimit || 0
                    });
                }
            }
        }

        await reply(`<a:verify:1539238356003848344> **RESTORE COMPLETED SUCCESSFULLY!**

<a:Loadings:1546810838055391240> Backup Source: **${backup.originalServerName}**
<a:idk:1546810329160228894> Restored To: **${targetGuild.name}**
<a:datatext:1546809664308641832> Backup ID: \`${backupId}\`

<a:arrow_arrow:1546812537805348916> Roles: ${backup.totalRoles}
<a:arrow_arrow:1546812537805348916> Categories: ${backup.totalCategories}
<a:arrow_arrow:1546812537805348916> Text Channels: ${backup.totalTextChannels}
<a:arrow_arrow:1546812537805348916> Voice Channels: ${backup.totalVoiceChannels}
<a:arrow_arrow:1546812537805348916> Total Channels: ${backup.totalChannels}`);

    } catch (err) {
        console.error(err);
        await reply(`<a:wrong1:1546809103702167642> Restore Failed!\nError: ${err.message}`);
    }
}

module.exports = { handleBackup, handleRestore, PREFIX };