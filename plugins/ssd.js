// 🎬 SINHALASUB MOVIE SEARCH + DOWNLOAD
// API : sadaslk-apis.vercel.app
// Fixed + Stable Version by Wasantha X GPT

const consoleLog = console.log;
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const BRAND = config.MOVIE_FOOTER || 'Cinesubz ©2025';

// 🔑 API Config
const API_KEY = 'c56182a993f60b4f49cf97ab09886d17';
const SEARCH_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/search';
const INFO_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/infodl';

// 🎬 Main command
cmd({
  pattern: 'sinhalasub',
  react: '🎥',
  desc: 'Search SinhalaSub movies + download links',
  category: 'Movie / TV',
  filename: __filename
}, async (client, m, msg, { from, q }) => {

  const usage = '*🎬 SinhalaSub Movie Search*\n\nUsage: .sinhalasub <movie name>\nExample: .sinhalasub 2024\n\nSearch Sinhala-subtitled movies and get direct links.';

  if (!q) return client.sendMessage(from, { text: usage }, { quoted: m });

  try {
    const cacheKey = 'ss_' + q.toLowerCase();
    let results = cache.get(cacheKey);

    if (!results) {
      const res = await axios.get(`${SEARCH_URL}?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`);
      if (!res.data?.data?.length) throw new Error('No movies found.');
      results = res.data.data;
      cache.set(cacheKey, results);
    }

    let text = '*🎬 SinhalaSub Search Results*\n\n';
    results.forEach((r, i) => {
      text += `${i + 1}. ${r.title || 'Unknown Title'} (${r.year || 'N/A'})\n⭐ IMDb: ${r.imdb || 'N/A'}\n\n`;
    });
    text += '👉 Reply with number to get download links.\n\n_© ' + BRAND + '_';

    const sent = await client.sendMessage(from, {
      image: { url: results[0]?.poster || results[0]?.thumbnail || '' },
      caption: text
    }, { quoted: m });

    // 📥 Handle reply (movie pick)
    const handleReply = async ({ messages }) => {
      const rMsg = messages?.[0];
      const body = rMsg?.message?.conversation?.trim();
      if (!body) return;
      const num = parseInt(body, 10);
      if (isNaN(num) || num < 1 || num > results.length) return;

      const movie = results[num - 1];
      if (!movie?.link) return client.sendMessage(from, { text: '❌ No valid movie link found.' }, { quoted: rMsg });

      const infoUrl = `${INFO_URL}?q=${encodeURIComponent(movie.link)}&apiKey=${API_KEY}`;
      const infoRes = await axios.get(infoUrl);
      const data = infoRes.data?.data;
      if (!data) return client.sendMessage(from, { text: '❌ No detailed info found.' }, { quoted: rMsg });

      const downloads = data.downloads || [];
      if (!downloads.length) return client.sendMessage(from, { text: '❌ No download links available.' }, { quoted: rMsg });

      let caption = `🎬 *${data.title || 'Unknown Title'}*\n\n⭐ IMDb: ${data.imdb || 'N/A'}\n📅 Year: ${data.year || 'N/A'}\n\n📥 *Available Qualities:*\n`;
      downloads.forEach((d, i) => {
        caption += `${i + 1}. [${d.quality || 'N/A'}] ${d.size || 'N/A'}\n`;
      });
      caption += '\nReply with number to download.\n\n_© ' + BRAND + '_';

      const pickMsg = await client.sendMessage(from, {
        image: { url: data.poster || data.thumbnail || '' },
        caption
      }, { quoted: rMsg });

      // 🎬 Handle download pick
      const handlePick = async ({ messages }) => {
        const pMsg = messages?.[0];
        const body2 = pMsg?.message?.conversation?.trim();
        if (!body2) return;
        const pick = parseInt(body2, 10);
        if (isNaN(pick) || pick < 1 || pick > downloads.length) return;

        const choice = downloads[pick - 1];
        const link = choice?.link;
        const size = choice?.size || 'Unknown';
        const fileName = `SINHALASUB • ${data.title || 'Movie'} • ${choice.quality || ''}.mp4`;

        if (!link || link === '' || typeof link !== 'string') {
          await client.sendMessage(from, { text: `❌ No valid file link found for ${data.title}.` }, { quoted: pMsg });
          return;
        }

        const sizeGB = parseSizeToGB(size);
        if (sizeGB > 2) {
          await client.sendMessage(from, { text: `⚠️ File too large (${size}). Direct link:\n${link}` }, { quoted: pMsg });
          return;
        }

        try {
          await client.sendMessage(from, {
            document: { url: link },
            mimetype: 'video/mp4',
            fileName,
            caption: `🎬 ${data.title}\n📥 ${choice.quality || ''} (${size})\n\n${BRAND}`
          }, { quoted: pMsg });
          await client.sendMessage(from, { react: { text: '✅', key: pMsg.key } });
        } catch (e) {
          consoleLog('⚠️ FILE SEND ERROR:', e.message);
          await client.sendMessage(from, { text: `❌ Failed to send file.\nDirect link:\n${link}` }, { quoted: pMsg });
        }
      };

      client.ev.on('messages.upsert', handlePick);
    };

    client.ev.on('messages.upsert', handleReply);

  } catch (err) {
    consoleLog('❌ ERROR:', err);
    await client.sendMessage(from, { text: '❌ Error: ' + (err.message || String(err)) }, { quoted: m });
  }
});

// 🔧 Safe size parser
function parseSizeToGB(size) {
  if (!size) return 0;
  const s = String(size).trim().toUpperCase();
  if (s.endsWith('GB')) return parseFloat(s) || 0;
  if (s.endsWith('MB')) return (parseFloat(s) || 0) / 1024;
  return 0;
}
