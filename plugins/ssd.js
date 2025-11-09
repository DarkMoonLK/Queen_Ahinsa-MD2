// 🎬 SinhalaSub Movie Search + Download (ENOENT fixed)
const consoleLog = console.log;
const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60 });
const BRAND = config.MOVIE_FOOTER || 'Cinesubz ©2025';

const API_KEY = 'c56182a993f60b4f49cf97ab09886d17';
const SEARCH_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/search';
const INFO_URL = 'https://sadaslk-apis.vercel.app/api/v1/movie/sinhalasub/infodl';

cmd({
  pattern: 'sinhalasub',
  react: '🎬',
  desc: 'SinhalaSub movie search and downloader',
  category: 'Movie / TV',
  filename: __filename
}, async (client, m, msg, { from, q }) => {

  if (!q) {
    await client.sendMessage(from, { text: '🎬 Use like: *.sinhalasub Venom*' }, { quoted: m });
    return;
  }

  try {
    const cacheKey = 'ss_' + q.toLowerCase();
    let data = cache.get(cacheKey);

    if (!data) {
      const res = await axios.get(`${SEARCH_URL}?q=${encodeURIComponent(q)}&apiKey=${API_KEY}`);
      if (!res.data?.data?.length) throw new Error('No movies found.');
      data = res.data.data;
      cache.set(cacheKey, data);
    }

    let txt = '*🎬 SinhalaSub Results*\n\n';
    data.forEach((m, i) => {
      txt += `${i + 1}. ${m.title || 'Unknown'} (${m.year || 'N/A'})\n⭐ ${m.imdb || ''}\n\n`;
    });
    txt += 'Reply with number to get download links.';

    const sent = await client.sendMessage(from, {
      image: { url: data[0]?.poster || data[0]?.thumbnail || '' },
      caption: txt
    }, { quoted: m });

    const handleReply = async ({ messages }) => {
      const rMsg = messages?.[0];
      const body = rMsg?.message?.conversation?.trim();
      if (!body) return;
      const n = parseInt(body, 10);
      if (isNaN(n) || n < 1 || n > data.length) return;

      const movie = data[n - 1];
      const infoRes = await axios.get(`${INFO_URL}?q=${encodeURIComponent(movie.link)}&apiKey=${API_KEY}`);
      const info = infoRes.data?.data;
      if (!info) return client.sendMessage(from, { text: '❌ No info found.' }, { quoted: rMsg });

      const dl = info.downloads || [];
      if (!dl.length) return client.sendMessage(from, { text: '❌ No download links.' }, { quoted: rMsg });

      let cap = `🎬 *${info.title}*\n\n⭐ ${info.imdb || 'N/A'} | ${info.year || ''}\n\n`;
      dl.forEach((d, i) => {
        cap += `${i + 1}. ${d.quality || 'N/A'} (${d.size || '?'})\n`;
      });
      cap += '\nReply with number to download.';

      const pick = await client.sendMessage(from, {
        image: { url: info.poster || info.thumbnail || '' },
        caption: cap
      }, { quoted: rMsg });

      const handlePick = async ({ messages }) => {
        const pMsg = messages?.[0];
        const body2 = pMsg?.message?.conversation?.trim();
        const num = parseInt(body2, 10);
        if (isNaN(num) || num < 1 || num > dl.length) return;
        const choice = dl[num - 1];
        const link = choice?.link;

        // ✅ ENOENT Protection
        if (!link || link.trim() === '' || link === 'null' || link.startsWith('about:blank')) {
          await client.sendMessage(from, { text: `❌ Invalid file link.\n\nDirect link:\n${link || 'N/A'}` }, { quoted: pMsg });
          return;
        }

        const size = choice.size || '?';
        const fileName = `SINHALASUB • ${info.title || 'Movie'} • ${choice.quality || ''}.mp4`;

        try {
          await client.sendMessage(from, {
            document: { url: link },
            mimetype: 'video/mp4',
            fileName,
            caption: `🎥 ${info.title}\nQuality: ${choice.quality}\nSize: ${size}\n\n${BRAND}`
          }, { quoted: pMsg });
        } catch (err) {
          consoleLog('⚠️ FILE SEND FAILED:', err.message);
          await client.sendMessage(from, { text: `⚠️ Couldn't send file.\nDirect link:\n${link}` }, { quoted: pMsg });
        }
      };
      client.ev.on('messages.upsert', handlePick);
    };
    client.ev.on('messages.upsert', handleReply);

  } catch (err) {
    consoleLog('❌', err);
    await client.sendMessage(from, { text: '❌ Error: ' + (err.message || String(err)) }, { quoted: m });
  }
});
