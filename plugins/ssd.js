// 🎬 SINHALASUB MOVIE SEARCH & AUTO DOWNLOAD
// API by sadaslk-apis.vercel.app
// Created by Wasantha X GPT

const consoleLog = console.log;
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const NodeCache = require('node-cache');

const searchCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const BRAND = '' + config.MOVIE_FOOTER;

// 🔑 API details
const API_KEY = 'c56182a993f60b4f49cf97ab09886d17';
const SEARCH_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/search';
const INFO_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/infodl';

cmd({
  pattern: 'sinhalasub',
  react: '🎬',
  desc: 'Search SinhalaSub Movies and Download',
  category: 'Movie / TV',
  filename: __filename
}, async (client, m, msg, { from, q }) => {

  const USAGE = '*🎬 SinhalaSub Movie Search*\n\nUsage: .sinhalasub <movie name>\nExample: .sinhalasub Avatar\n\nType your movie name 🔍';

  if (!q) return client.sendMessage(from, { text: USAGE }, { quoted: m });

  try {
    const cacheKey = 'sinhalasub_' + q.toLowerCase();
    let data = searchCache.get(cacheKey);

    if (!data) {
      const { data: res } = await axios.get(`${SEARCH_URL}?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`);
      if (!res.status || !res.data?.length) throw new Error('❌ No results found.');
      data = res.data;
      searchCache.set(cacheKey, data);
    }

    let caption = '*🎬 SinhalaSub Results*\n\n';
    data.forEach((item, i) => {
      caption += `${i + 1}. ${item.title} (${item.year})\n⭐ IMDb: ${item.imdb}\n\n`;
    });
    caption += '👉 Reply with movie number to get download links.\n\n_© ' + BRAND + '_';

    const sentMsg = await client.sendMessage(from, {
      image: { url: data[0].poster || data[0].thumbnail },
      caption
    }, { quoted: m });

    const handleReply = async ({ messages }) => {
      const incoming = messages?.[0];
      if (!incoming?.message?.conversation) return;
      const text = incoming.message.conversation.trim();
      const num = parseInt(text, 10);

      if (isNaN(num) || num < 1 || num > data.length) return;
      const movie = data[num - 1];

      // Get movie info + download
      const infoURL = `${INFO_URL}?q=${encodeURIComponent(movie.link)}&apiKey=${API_KEY}`;
      const { data: info } = await axios.get(infoURL);

      if (!info || !info.data) {
        await client.sendMessage(from, { text: '❌ Could not fetch movie details.' }, { quoted: incoming });
        return;
      }

      const movieData = info.data;
      const downloads = movieData.downloads || [];

      if (!downloads.length) {
        await client.sendMessage(from, { text: '❌ No download links found.' }, { quoted: incoming });
        return;
      }

      let caption2 = `🎬 *${movieData.title}*\n\n⭐ IMDb: ${movieData.imdb}\n📅 Year: ${movieData.year}\n\n📥 *Select Quality:*\n`;
      downloads.forEach((dl, i) => {
        caption2 += `${i + 1}. [${dl.quality}] ${dl.size}\n`;
      });
      caption2 += '\n➡️ Reply with number to download\n\n_© ' + BRAND + '_';

      const sentPickMsg = await client.sendMessage(from, {
        image: { url: movieData.poster || movieData.thumbnail },
        caption: caption2
      }, { quoted: incoming });

      const handlePick = async ({ messages }) => {
        const pickMsg = messages?.[0];
        if (!pickMsg?.message?.conversation) return;
        const pickNum = parseInt(pickMsg.message.conversation.trim(), 10);
        if (isNaN(pickNum) || pickNum < 1 || pickNum > downloads.length) return;

        const choice = downloads[pickNum - 1];
        const link = choice.link;
        const size = choice.size || 'Unknown';
        const fileName = `SINHALASUB • ${movieData.title} • ${choice.quality}.mp4`;

        // File size safety check
        const sizeInGB = parseSizeToGB(size);
        if (sizeInGB > 2) {
          await client.sendMessage(from, { text: `⚠️ File too large (${size}).\nDirect link:\n${link}` }, { quoted: pickMsg });
          return;
        }

        try {
          await client.sendMessage(from, {
            document: { url: link },
            mimetype: 'video/mp4',
            fileName,
            caption: `🎬 ${movieData.title}\n📥 ${choice.quality} (${size})\n\n${BRAND}`
          }, { quoted: pickMsg });
          await client.sendMessage(from, { react: { text: '✅', key: pickMsg.key } });
        } catch (err) {
          await client.sendMessage(from, { text: `❌ Failed to send.\nDirect link:\n${link}` }, { quoted: pickMsg });
        }
      };

      client.ev.on('messages.upsert', handlePick);
    };

    client.ev.on('messages.upsert', handleReply);

  } catch (err) {
    consoleLog(err);
    await client.sendMessage(from, { text: '❌ Error: ' + err.message }, { quoted: m });
  }
});

// helper: parse size string to GB
function parseSizeToGB(sizeStr) {
  if (!sizeStr) return 0;
  const s = String(sizeStr).trim().toUpperCase();
  if (s.endsWith('GB')) return parseFloat(s) || 0;
  if (s.endsWith('MB')) return (parseFloat(s) || 0) / 1024;
  return 0;
}
