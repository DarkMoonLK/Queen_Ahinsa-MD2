// 🎬 CINESUBZ MOVIE / TV SHOW SEARCH & DOWNLOAD
// by Wasantha X GPT

const consoleLog = console.log;
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const NodeCache = require('node-cache');

const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const BRAND = '' + config.MOVIE_FOOTER;
const API_KEY = "c93275e5c8e72394aad19a7f43a521490719889e3e77c6769bf342d2a722eddb";
const API_BASE = "https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/cinesubz";

// REGISTER COMMAND
cmd({
  pattern: 'cinesubz',
  react: '🎬',
  desc: 'Search & Download Sinhala Sub Movies / TV Series',
  category: 'Movie / TV',
  filename: __filename
}, async (client, quotedMsg, msg, { from, q }) => {

  const USAGE_TEXT = 
  '*🎬 CINESUBZ MOVIE / TV SERIES SEARCH*\n\n' +
  '📋 Usage: .cinesubz <movie name>\n\n' +
  '📝 Example: .cinesubz Vikram Vedha\n\n' +
  '*💡 Type Your Movie Name 👇*';

  if (!q) {
    await client.sendMessage(from, { text: USAGE_TEXT }, { quoted: quotedMsg });
    return;
  }

  try {
    const cacheKey = 'cinesubz_' + q.trim().toLowerCase();
    let searchResponse = searchCache.get(cacheKey);

    if (!searchResponse) {
      const url = `${API_BASE}/search`;
      const res = await axios.get(url, {
        params: { q },
        headers: { Authorization: `Bearer ${API_KEY}` },
        timeout: 10000
      });
      searchResponse = res.data;
      if (!searchResponse || !searchResponse.results || !Array.isArray(searchResponse.results))
        throw new Error('❌ No results found.');

      searchCache.set(cacheKey, searchResponse);
    }

    const results = searchResponse.results.map((item, idx) => ({
      n: idx + 1,
      title: item.title,
      year: item.year,
      link: item.link,
      image: item.thumbnail || item.image
    }));

    let caption = '*🎬 SEARCH RESULTS*\n\n';
    results.forEach(r => {
      caption += `${r.n}. ${r.title} (${r.year})\n\n`;
    });
    caption += '🔢 Reply with number to select movie.\n\n*~https://whatsapp.com/channel/0029Vb5xFPHGE56jTnm4ZD2k~*';

    const sentListMsg = await client.sendMessage(from, {
      image: { url: results[0].image },
      caption
    }, { quoted: quotedMsg });

    const pendingMap = new Map();

    const handleUpsert = async ({ messages }) => {
      const incoming = messages?.[0];
      if (!incoming || !incoming.message || !incoming.message.conversation) return;

      const text = (incoming.message.conversation || '').trim();
      const stanzaId = incoming.key?.id;

      if (text === '0') {
        client.ev.removeListener('messages.upsert', handleUpsert);
        pendingMap.clear();
        await client.sendMessage(from, { text: '✅ Cancelled.' }, { quoted: incoming });
        return;
      }

      // User selected movie number
      if (incoming.message?.contextInfo?.stanzaId === sentListMsg.key.id) {
        const selectedIndex = parseInt(text, 10);
        const selected = results.find(r => r.n === selectedIndex);

        if (!selected) {
          await client.sendMessage(from, { text: '❌ Invalid number.' }, { quoted: incoming });
          return;
        }

        // Fetch movie details
        const detailsUrl = `${API_BASE}/movie-details`;
        let details;
        try {
          const res = await axios.get(detailsUrl, {
            params: { url: selected.link },
            headers: { Authorization: `Bearer ${API_KEY}` },
            timeout: 10000
          });
          details = res.data;
        } catch (e) {
          await client.sendMessage(from, { text: '❌ Fetch failed.' }, { quoted: incoming });
          return;
        }

        const sources = details.sources || [];
        if (!sources.length) {
          await client.sendMessage(from, { text: '❌ No download links found.' }, { quoted: incoming });
          return;
        }

        let pickCaption = `*🎬 ${selected.title}*\n\n📥 *Select Quality:*\n\n`;
        sources.forEach((s, i) => {
          pickCaption += `${i + 1}. ${s.quality} (${s.size})\n`;
        });
        pickCaption += '\nReply with number to download.';

        const sentPickMsg = await client.sendMessage(from, {
          image: { url: details.thumbnail || selected.image },
          caption: pickCaption
        }, { quoted: incoming });

        pendingMap.set(sentPickMsg.key.id, { film: selected, sources });
        return;
      }

      // User selected quality
      if (pendingMap.has(incoming.message?.contextInfo?.stanzaId)) {
        const { film, sources } = pendingMap.get(incoming.message.contextInfo.stanzaId);
        const pick = sources[parseInt(text, 10) - 1];
        if (!pick) {
          await client.sendMessage(from, { text: '❌ Invalid selection.' }, { quoted: incoming });
          return;
        }

        const sizeInGB = parseSizeToGB(pick.size);
        if (sizeInGB > 2) {
          await client.sendMessage(from, { text: `⚠️ Too large. Direct link:\n${pick.direct_download}` }, { quoted: incoming });
          return;
        }

        const fileName = `CINESUBZ • ${film.title} • ${pick.quality}.mp4`;
        try {
          await client.sendMessage(from, {
            document: { url: pick.direct_download },
            mimetype: 'video/mp4',
            fileName,
            caption: `🎥 ${film.title}\nQuality: ${pick.quality}\n\n${BRAND}`
          }, { quoted: incoming });
          await client.sendMessage(from, { react: { text: '✅', key: incoming.key } });
        } catch (err) {
          await client.sendMessage(from, { text: `❌ Failed. Direct link:\n${pick.direct_download}` }, { quoted: incoming });
        }
      }
    };

    client.ev.on('messages.upsert', handleUpsert);

  } catch (err) {
    consoleLog(err);
    await client.sendMessage(from, { text: '❌ Error: ' + (err.message || String(err)) }, { quoted: quotedMsg });
  }
});

// Convert readable size → GB float
function parseSizeToGB(sizeStr) {
  if (!sizeStr) return 0;
  const s = String(sizeStr).trim().toUpperCase();
  if (s.endsWith('GB')) return parseFloat(s.replace('GB', '').trim()) || 0;
  if (s.endsWith('MB')) return (parseFloat(s.replace('MB', '').trim()) || 0) / 1024;
  return 0;
}
