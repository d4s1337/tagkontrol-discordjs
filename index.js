
const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GatewayIntentBits,
  InteractionType,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
} = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
if (!token || !clientId) {
  console.error('DISCORD_TOKEN ve CLIENT_ID environment değişkenlerini ayarlayın.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

const DB_FILE = path.resolve(process.cwd(), 'dasi.json');

const tagRoleByGuild = new Map(); 
const tagCycleState = new Map();  


function mapsToDbObject() {
  return {
    tagRoles: Object.fromEntries(tagRoleByGuild.entries()),
    tagCycles: Object.fromEntries(tagCycleState.entries()),
  };
}

async function saveDb() {
  const data = JSON.stringify(mapsToDbObject(), null, 2);
  await fs.promises.writeFile(DB_FILE, data, 'utf8');
}

async function loadDb() {
  try {
    const raw = await fs.promises.readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed?.tagRoles && typeof parsed.tagRoles === 'object') {
      tagRoleByGuild.clear();
      for (const [g, r] of Object.entries(parsed.tagRoles)) tagRoleByGuild.set(g, r);
    }
    if (parsed?.tagCycles && typeof parsed.tagCycles === 'object') {
      tagCycleState.clear();
      for (const [g, v] of Object.entries(parsed.tagCycles)) {
        if (v && typeof v === 'object' && v.tag && v.intervalMs && v.intervalLabel) {
          tagCycleState.set(g, v);
        }
      }
    }
  } catch (err) {
    
    if (err.code !== 'ENOENT') console.warn('DB load warning:', err.message);
  }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const td = (content) => new TextDisplayBuilder().setContent(String(content ?? ''));

async function getIdentityGuild(userId) {
  try {
    const user = await rest.get(Routes.user(userId));
    return user?.clan?.identity_guild_id ?? null;
  } catch {
    return null;
  }
}


const memberFetchInFlight = new Map(); 
const memberFetchTimestamp = new Map(); 
const MEMBER_CACHE_TTL = 30_000; 

async function ensureGuildMembers(guild) {
  const last = memberFetchTimestamp.get(guild.id) ?? 0;
  const fresh = Date.now() - last < MEMBER_CACHE_TTL;
  if (fresh && guild.members.cache.size > 0) return guild.members.cache;

  if (!memberFetchInFlight.has(guild.id)) {
    const p = guild.members.fetch()
      .catch((err) => {

        if (err?.name === 'GatewayRateLimitError') return;
        throw err;
      })
      .finally(() => {
        memberFetchInFlight.delete(guild.id);
        memberFetchTimestamp.set(guild.id, Date.now());
      });
    memberFetchInFlight.set(guild.id, p);
  }
  await memberFetchInFlight.get(guild.id);
  return guild.members.cache;
}

async function fetchRole(guild, roleId) {
  if (!roleId) return null;
  const cached = guild.roles.cache.get(roleId);
  if (cached) return cached;
  try {
    const role = await guild.roles.fetch(roleId);
    return role ?? null;
  } catch {
    return null;
  }
}

function buildTagStatusContainer(hasCount, noCount) {
  const text1 = td('<:d4sinfo:1462152357721804923> **Tag kontrolü (identity_guild_id)**');
  const text2 = td(`<:d4syesil:1462153490557046977> Tag Sahibi: **${hasCount}** üye`);
  const text3 = td(`<:d4smembers:1462152362029482267> Tag Sahibi Değil: **${noCount}** üye`);

  return new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(text1, text2, text3);
}

function buildInfoContainer(lines, color = 0x5865f2) {
  const textDisplays = lines.map((line) => td(line));
  return new ContainerBuilder().setAccentColor(color).addTextDisplayComponents(...textDisplays);
}

function buildSelects(tagId) {
  const hasTagSelect = new StringSelectMenuBuilder()
    .setCustomId(`has:${tagId}`)
    .setPlaceholder('Tagı olanlara uygulanacak aksiyon')
    .addOptions(
      { label: 'Rol Ver', value: 'role-give', description: 'Tag rolünü ver' },
      { label: 'İsim düzenle', value: 'rename', description: 'İsmin başına tag ekle' },
      { label: 'Hiçbir şey yapma', value: 'noop', description: 'Herhangi bir aksiyon alma' },
    );

  const noTagSelect = new StringSelectMenuBuilder()
    .setCustomId(`no:${tagId}`)
    .setPlaceholder('Tagı olmayanlara uygulanacak aksiyon')
    .addOptions(
      { label: 'Rol Ver', value: 'role-give', description: 'Tag rolünü ver' },
      { label: 'Sunucudan At', value: 'kick', description: 'Tagı olmayanları at' },
      { label: 'İsim Düzenle', value: 'rename', description: 'İsim başına tag ekle' },
      { label: 'Timeout Uygula', value: 'timeout', description: 'Süreli timeout uygula' },
      { label: 'Rol Al', value: 'role-remove', description: 'Tag rolünü geri al' },
    );

  return [
    new ActionRowBuilder().addComponents(hasTagSelect),
    new ActionRowBuilder().addComponents(noTagSelect),
  ];
}

async function classifyMembersByIdentityGuild(guild) {
  await ensureGuildMembers(guild);
  const members = [...guild.members.cache.values()].filter((m) => !m.user.bot);
  const hasTag = [];
  const noTag = [];

  for (const m of members) {
    const identityGuild = await getIdentityGuild(m.id);
    if (identityGuild === guild.id) hasTag.push(m);
    else noTag.push(m);
  }
  return { hasTag, noTag };
}

async function runTagCheck(interaction) {
  const guild = interaction.guild;
  const { hasTag, noTag } = await classifyMembersByIdentityGuild(guild);

  const statusContainer = buildTagStatusContainer(hasTag.length, noTag.length);
  const selectRows = buildSelects(guild.id);

  const payload = {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [statusContainer, ...selectRows],
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

function intervalLabelAndMs(val) {
  switch (val) {
    case '1h': return { label: '1 Saat', ms: 60 * 60 * 1000 };
    case '12h': return { label: '12 Saat', ms: 12 * 60 * 60 * 1000 };
    case '1d': return { label: '1 Gün', ms: 24 * 60 * 60 * 1000 };
    case '3d': return { label: '3 Gün', ms: 3 * 24 * 60 * 60 * 1000 };
    case '7d': return { label: '7 Gün', ms: 7 * 24 * 60 * 60 * 1000 };
    default: return null;
  }
}

function requireAdminOrOwner(interaction) {
  const guild = interaction.guild;
  const me = interaction.user.id;
  const member = guild.members.cache.get(me);
  if (!member) return false;
  const isOwner = guild.ownerId === me;
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  return isOwner || isAdmin;
}


const commands = [
  new SlashCommandBuilder()
    .setName('tagcheck')
    .setDescription('identity_guild_id ile üyeleri kontrol et ve aksiyon al.')
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('tagrole')
    .setDescription('Tag özel rolünü ayarla.')
    .addRoleOption((opt) => opt.setName('role').setDescription('Rol ID veya mention').setRequired(true))
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('tagcycle')
    .setDescription('Tag kontrol döngüsü ayarla veya kapat.')
    .setDMPermission(false),
].map((c) => c.toJSON());

async function registerCommands() {
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('Slash komutları kaydedildi.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once('clientReady', () => console.log(`Bot hazır: ${client.user?.tag}`));

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (!requireAdminOrOwner(interaction)) {
        const container = buildInfoContainer([
          '<:d4scross:1462152424557908099> Bu komutu kullanmak için Yönetici olmalı veya sunucu sahibi olmalısın.',
          '-# dasi',
        ], 0xed4245);

        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
        return;
      }

      if (interaction.commandName === 'tagrole') {
        const role = interaction.options.getRole('role', true);
        tagRoleByGuild.set(interaction.guildId, role.id);
        await saveDb();

        const container = buildInfoContainer([
          `<:d4sverified:1462152354567557406> Tag rolü ayarlandı: ${role}`,
          '-# dasi',
        ]);

        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
        return;
      }

      if (interaction.commandName === 'tagcheck') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 
        await runTagCheck(interaction);
        return;
      }

      if (interaction.commandName === 'tagcycle') {
        const guild = interaction.guild;
        const current = tagCycleState.get(guild.id);

        if (current) {
          const container = buildInfoContainer([
            '<:d4sinfo:1462152357721804923> TagCycle zaten açık.',
            `Tag: \`${current.tag}\``,
            `Döngü: \`${current.intervalLabel}\``,
            'Seçim yapın.',
            '-# dasi',
          ]);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tagcycle:edit').setLabel('Düzenle').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tagcycle:stop').setLabel('Kapat').setStyle(ButtonStyle.Danger),
          );

          await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container, row],
          });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`tagcycleModal:new:${guild.id}`)
          .setTitle('TagCycle Başlat')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('tag')
                .setLabel('Tag (varsayılan: bu sunucu ID)')
                .setPlaceholder(guild.id)
                .setMaxLength(32)
                .setMinLength(2)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(guild.id),
            ),
          );
        await interaction.showModal(modal);
        return;
      }
    }

   
    
    if (interaction.isStringSelectMenu() && (interaction.customId.startsWith('has:') || interaction.customId.startsWith('no:'))) {
      const [kind, tagGuildId] = interaction.customId.split(':'); 
      if (interaction.guildId !== tagGuildId) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Bu seçim başka sunucu için.', '-# dasi'], 0xed4245);
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
        return;
      }

      const selection = interaction.values[0];
      const guild = interaction.guild;
      await ensureGuildMembers(guild);
      const members = [...guild.members.cache.values()].filter((m) => !m.user.bot);

      const target = [];
      for (const m of members) {
        const identityGuild = await getIdentityGuild(m.id);
        const has = identityGuild === guild.id;
        if ((kind === 'has' && has) || (kind === 'no' && !has)) target.push(m);
      }

      if (selection === 'noop') {
        const container = buildInfoContainer(['<:d4sinfo:1462152357721804923> Hiçbir şey yapılmadı.', '-# dasi']);
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
        return;
      }

      if (selection === 'rename') {
        const modal = new ModalBuilder()
          .setCustomId(`rename:${kind}:${tagGuildId}`)
          .setTitle('İsim Başına Eklenecek Tag')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('prefix')
                .setLabel('Başına eklenecek ifade (örn. [TAG])')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(32),
            ),
          );
        await interaction.showModal(modal);
        return;
      }

      if (selection === 'role-give' || selection === 'role-remove') {
        const role = await fetchRole(guild, tagRoleByGuild.get(guild.id));
        if (!role) {
          const container = buildInfoContainer(['<:d4scross:1462152424557908099> Tag rolü ayarlı değil. `/tagrole` ile ayarlayın.', '-# dasi'], 0xed4245);
          await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [container],
          });
          return;
        }
        const apply = selection === 'role-give';
        let acted = 0;
        for (const m of target) {
          try {
            if (apply) await m.roles.add(role, 'Tag kontrolü (identity_guild_id)');
            else await m.roles.remove(role, 'Tag kontrolü (identity_guild_id)');
            acted++;
          } catch {
            /* ignore */
          }
        }
        const container = buildInfoContainer([
          apply ? '<:d4sverified:1462152354567557406> Rol verildi' : '<:d4sverified:1462152354567557406> Rol alındı',
          `(${acted}/${target.length})`,
          '-# dasi',
        ]);
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
        return;
      }

      if (selection === 'kick') {
        let acted = 0;
        for (const m of target) {
          try {
            await m.kick(`${interaction.user.tag} talimatıyla identity_guild_id eşleşmiyor`);
            acted++;
          } catch {
            /* ignore */
          }
        }
        const container = buildInfoContainer([`<:d4sverified:1462152354567557406> Atılanlar: ${acted}/${target.length}`, '-# dasi']);
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
        return;
      }

      if (selection === 'timeout') {
        const durationSelect = new StringSelectMenuBuilder()
          .setCustomId(`timeout:${kind}:${tagGuildId}`)
          .setPlaceholder('Timeout süresi seçin')
          .addOptions(
            { label: '5 dakika', value: '5m' },
            { label: '10 dakika', value: '10m' },
            { label: '1 saat', value: '1h' },
            { label: '1 gün', value: '1d' },
            { label: '1 hafta', value: '1w' },
          );

        const container = buildInfoContainer(['<:d4sanahtar:1462152360401965346> Timeout süresi seçin.', '-# dasi']);
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container, new ActionRowBuilder().addComponents(durationSelect)],
        });
        return;
      }
    }

    
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('timeout:')) {
      const [, kind, tagGuildId] = interaction.customId.split(':');
      if (interaction.guildId !== tagGuildId) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Bu seçim başka sunucu için.', '-# dasi'], 0xed4245);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      const duration = interaction.values[0];
      const multipliers = { '5m': 5, '10m': 10, '1h': 60, '1d': 1440, '1w': 10080 };
      const minutes = multipliers[duration] ?? 5;
      const ms = minutes * 60 * 1000;

      await ensureGuildMembers(interaction.guild);
      const members = [...interaction.guild.members.cache.values()].filter((m) => !m.user.bot);

      const target = [];
      for (const m of members) {
        const identityGuild = await getIdentityGuild(m.id);
        const has = identityGuild === interaction.guildId;
        if ((kind === 'has' && has) || (kind === 'no' && !has)) target.push(m);
      }

      let success = 0;
      for (const m of target) {
        try {
          await m.timeout(ms, 'Tag kontrolü (identity_guild_id)');
          success++;
        } catch {
          /* ignore */
        }
      }
      const container = buildInfoContainer([`<:d4sverified:1462152354567557406> Timeout uygulandı: ${success}/${target.length}`, '-# dasi']);
      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

  
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('rename:')) {
      const [, kind, tagGuildId] = interaction.customId.split(':');
      if (interaction.guildId !== tagGuildId) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Geçersiz sunucu.', '-# dasi'], 0xed4245);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      const prefix = interaction.fields.getTextInputValue('prefix');
      await ensureGuildMembers(interaction.guild);
      const members = [...interaction.guild.members.cache.values()].filter((m) => !m.user.bot);

      const target = [];
      for (const m of members) {
        const identityGuild = await getIdentityGuild(m.id);
        const has = identityGuild === interaction.guildId;
        if ((kind === 'has' && has) || (kind === 'no' && !has)) target.push(m);
      }

      let success = 0;
      for (const m of target) {
        const newName = `${prefix} ${m.displayName.replace(new RegExp(`^${escapeRegex(prefix)}\\s*`, 'i'), '')}`
          .trim()
          .slice(0, 32);
        try {
          await m.setNickname(newName, 'Tag kontrolü (identity_guild_id)');
          success++;
        } catch {
          /* ignore */
        }
      }
      const container = buildInfoContainer([`<:d4sverified:1462152354567557406> İsim düzenleme tamamlandı: ${success}/${target.length}`, '-# dasi']);
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
      });
      return;
    }


    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('tagcycleModal:')) {
      const [, mode, guildId] = interaction.customId.split(':'); 
      if (interaction.guildId !== guildId) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Geçersiz sunucu.', '-# dasi'], 0xed4245);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      const tagInput = interaction.fields.getTextInputValue('tag').trim();
      if (!tagInput || tagInput !== guildId) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Tag bu sunucunun ID\'si olmalı.', '-# dasi'], 0xed4245);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`tagcycleInterval:${mode}:${guildId}:${tagInput}`)
        .setPlaceholder('Kontrol Döngüsü Seç')
        .addOptions(
          { label: '1 Saat', value: '1h' },
          { label: '12 Saat', value: '12h' },
          { label: '1 Gün', value: '1d' },
          { label: '3 Gün', value: '3d' },
          { label: '7 Gün', value: '7d' },
        );

      const container = buildInfoContainer(['<:d4sanahtar:1462152360401965346> Kontrol Döngüsü seçin.', '-# dasi']);
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container, new ActionRowBuilder().addComponents(select)],
      });
      return;
    }

   
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('tagcycleInterval:')) {
      const [, mode, guildId, tag] = interaction.customId.split(':');
      if (interaction.guildId !== guildId || tag !== guildId) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Geçersiz sunucu veya tag.', '-# dasi'], 0xed4245);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      const choice = interaction.values[0];
      const info = intervalLabelAndMs(choice);
      if (!info) {
        const container = buildInfoContainer(['<:d4scross:1462152424557908099> Geçersiz süre.', '-# dasi'], 0xed4245);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      tagCycleState.set(guildId, { tag, intervalMs: info.ms, intervalLabel: info.label });
      await saveDb();

      const container = buildInfoContainer([
        `<:d4sverified:1462152354567557406> TagCycle ${mode === 'edit' ? 'güncellendi' : 'başlatıldı'}.`,
        `Tag: \`${tag}\``,
        `Döngü: \`${info.label}\``,
        '-# dasi',
      ]);

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
      return;
    }

 
    if (interaction.isButton() && (interaction.customId === 'tagcycle:stop' || interaction.customId === 'tagcycle:edit')) {
      const state = tagCycleState.get(interaction.guildId);
      if (!state) {
        const container = buildInfoContainer(['<:d4sinfo:1462152357721804923> Aktif TagCycle yok.', '-# dasi']);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      if (interaction.customId === 'tagcycle:stop') {
        tagCycleState.delete(interaction.guildId);
        await saveDb();

        const container = buildInfoContainer(['<:d4sverified:1462152354567557406> TagCycle kapatıldı.', '-# dasi']);
        await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        return;
      }
      if (interaction.customId === 'tagcycle:edit') {
        const modal = new ModalBuilder()
          .setCustomId(`tagcycleModal:edit:${interaction.guildId}`)
          .setTitle('TagCycle Düzenle')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('tag')
                .setLabel('Tag (bu sunucu ID\'si)')
                .setPlaceholder(interaction.guildId)
                .setMaxLength(32)
                .setMinLength(2)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(interaction.guildId),
            ),
          );
        await interaction.showModal(modal);
        return;
      }
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable()) {
      const container = buildInfoContainer(['<:d4scross:1462152424557908099> Bir hata oluştu.', '-# dasi'], 0xed4245);
      await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] }).catch(() => {});
    }
  }
});


(async () => {
  await loadDb();
  await registerCommands();
  await client.login(token);
})();