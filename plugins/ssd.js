// 🎬 SINHALASUB MOVIE SEARCH & AUTO DOWNLOAD
// API by sadaslk-apis.vercel.app
// Stable Edition by Wasantha X GPT

const consoleLog = console.log;
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const NodeCache = require('node-cache');

const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const BRAND = '' + (config.MOVIE_FOOTER || 'Cinesubz ©2025');

// 🔑 API info
const API_KEY = 'c56182a993f60b4f49cf97ab09886d17';
const SEARCH_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/search';
const INFO_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/infodl';

cmd({
  pattern: 'sinhalasub',
  react: '🎬',
  desc: 'Search SinhalaSub movies and auto-download',
  category: 'Movie / TV',
  filename: __filename
}, async (client, m, msg, { from, q }) => {

  const USAGE = '*🎬 SinhalaSub Search*\n\nUsage: .sinhalasub <movie name>\nExample: .sinhalasub Venom\n\nType your movie name 🔍';

  if (!q) return client.sendMessage(from, { text: USAGE }, { quoted: m });

  try {
    const cacheKey = 'sinhalasub_' + q.toLowerCase();
    let results = searchCache.get(cacheKey);

    // 🧭 Fetch search results
    if (!results) {
      const res = await axios.get(`${SEARCH_URL}?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`);
      if (!res.data || !Array.isArray(res.data.data) || res.data.data.length === 0) {
        throw new Error('❌ No results found.');
      }
      results = res.data.data;
      searchCache.set(cacheKey, results);
    }

    // 📋 Build search result caption
    let caption = '*🎬 SinhalaSub Results*\n\n';
    results.forEach((r, i) => {
      caption += `${i + 1}. ${r.title || 'Unknown Title'} (${r.year || 'N/A'})\n⭐ IMDb: ${r.imdb || 'N/A'}\n\n`;
    });
    caption += '👉 Reply with number to get download links.\n\n_© ' + BRAND + '_';

    const sentMsg = await client.sendMessage(from, {
      image: { url: results[0]?.poster || results[0]?.thumbnail || '' },
      caption
    }, { quoted: m });

    // 🎯 Step 2: Handle movie selection
    const handleReply = async ({ messages }) => {
      const incoming = messages?.[0];
      if (!incoming?.message?.conversation) return;
      const text = incoming.message.conversation.trim();
      const num = parseInt(text, 10);

      if (isNaN(num) || num < 1 || num > results.length) return;
      const movie = results[num - 1];
      if (!movie?.link) {
        await client.sendMessage(from, { text: '❌ Invalid movie link.' }, { quoted: incoming });
        return;
      }

      // 🎬 Fetch movie info
      const infoUrl = `${INFO_URL}?q=${encodeURIComponent(movie.link)}&apiKey=${API_KEY}`;
      const infoRes = await axios.get(infoUrl);
      const movieData = infoRes.data?.data;

      if (!movieData) {
        await client.sendMessage(from, { text: '❌ Movie details not found.' }, { quoted: incoming });
        return;
      }

      const downloads = Array.isArray(movieData.downloads) ? movieData.downloads : [];

      if (!downloads.length) {
        await client.sendMessage(from, { text: '❌ No download links available.' }, { quoted: incoming });
        return;
      }

      let cap2 = `🎬 *${movieData.title || 'Unknown Title'}*\n\n⭐ IMDb: ${movieData.imdb || 'N/A'}\n📅 Year: ${movieData.year || 'N/A'}\n\n📥 *Select Quality:*\n`;
      downloads.forEach((d, i) => {
        cap2 += `${i + 1}. [${d.quality || 'Unknown'}] ${d.size || 'N/A'}\n`;
      });
      cap2 += '\nReply with number to download. 📽️\n\n_© ' + BRAND + '_';

      const pickMsg = await client.sendMessage(from, {
        image: { url: movieData.poster || movieData.thumbnail || '' },
        caption: cap2
      }, { quoted: incoming });

      // 🎬 Step 3: Handle download quality selection
      const handlePick = async ({ messages }) => {
        const pickIncoming = messages?.[0];
        if (!pickIncoming?.message?.conversation) return;

        const pickNum = parseInt(pickIncoming.message.conversation.trim(), 10);
        if (isNaN(pickNum) || pickNum < 1 || pickNum > downloads.length) return;

        const choice = downloads[pickNum - 1];
        const link = choice?.link;
        const size = choice?.size || 'Unknown';
        const fileName = `SINHALASUB • ${movieData.title || 'Movie'} • ${choice.quality || 'Video'}.mp4`;

        if (!link) {
          await client.sendMessage(from, { text: '❌ No valid link found.' }, { quoted: pickIncoming });
          return;
        }

        const sizeGB = parseSizeToGB(size);
        if (sizeGB > 2) {
          await client.sendMessage(from, { text: `⚠️ File too large (${size}). Direct link:\n${link}` }, { quoted: pickIncoming });
          return;
        }

        try {
          await client.sendMessage(from, {
            document: { url: link.toString() },
            mimetype: 'video/mp4',
            fileName,
            caption: `🎬 ${movieData.title}\n📥 ${choice.quality || ''} (${size})\n\n${BRAND}`
          }, { quoted: pickIncoming });

          await client.sendMessage(from, { react: { text: '✅', key: pickIncoming.key } });
        } catch (err) {
          await client.sendMessage(from, { text: `❌ Failed to send.\nDirect link:\n${link}` }, { quoted: pickIncoming });
        }
      };

      client.ev.on('messages.upsert', handlePick);
    };

    client.ev.on('messages.upsert', handleReply);

  } catch (err) {
    consoleLog(err);
    await client.sendMessage(from, { text: '❌ Error: ' + (err.message || String(err)) }, { quoted: m });
  }
});

// 🧩 Size parser (safe)
function parseSizeToGB(sizeStr) {
  if (!sizeStr) return 0;
  const safeStr = String(sizeStr || '').trim().toUpperCase();
  if (safeStr.endsWith('GB')) return parseFloat(safeStr) || 0;
  if (safeStr.endsWith('MB')) return (parseFloat(safeStr) || 0) / 1024;
  return 0;
}
