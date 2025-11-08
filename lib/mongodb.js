const mongoose = require('mongoose');
const config = require('../config');
const EnvVar = require('./mongodbenv');

const defaultEnvVariables = [
    { key: 'ALIVE_IMG', value: 'https://i.ibb.co/SR76mBh/Pu3-ZYHBS5139.jpg' },
    { key: 'PREFIX', value: '.' },
    { key: 'MODE', value: 'private' },
    { key: 'AUTO_READ_STATUS', value: 'true' },
    { key: 'AUTO_REACT_STATUS', value: 'true' },
    { key: 'LANGUAGE', value: 'sinhala' },
    { key: 'AUTO_REACT', value: 'false' }, 
    { key: 'FAKE_RECORDING', value: 'false' },
    { key: 'AUTO_TYPING', value: 'false' },
    { key: 'ANTI_LINK', value: 'false' },
    { key: 'AUTO_VOICE', value: 'false' },
    { key: 'AUTO_REPLY', value: 'false' },
    { key: 'ANTI_BAD', value: 'false' },
    { key: 'READ_MESSAGE', value: 'false' },
    { key: 'ALWAYS_ONLINE', value: 'true' },
    { key: 'ANTI_DELETE', value: 'true' },
    { key: 'DELETEMSGSENDTO', value: 'none' },
    { key: 'INBOX_BLOCK', value: 'false' },
    { key: 'ANTI_BOT', value: 'false' },
    { key: 'AUTO_TIKTOK', value: 'false' },
    { key: 'AUTO_NEWS_ENABLED', value: 'false' },
    { key: 'SEND_START_NEWS', value: 'false' },
    { key: 'AUTO_NEWS_GROUP_JID', value: '120363420588030937@g.us' },
    { key: 'AUTO_TIKTOK_JID', value: '120363420588030937@g.us' },
    { key: 'MOVIE_FOOTER', value: '> *☫ 𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚍 𝙱𝚢 𝙳𝚒𝚕𝚒𝚜𝚑𝚊𝚃𝚎𝚌𝚑 ㋡*' },
    { key: 'BOT_NAME', value: 'Queen_Ahinsa-MD' },
    { key: 'MENU_IMG', value: 'https://i.ibb.co/SR76mBh/Pu3-ZYHBS5139.jpg' },
    { key: 'OWNER_REACT', value: 'true' },
    { key: 'FOOTER', value: '> *☫ 𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚍 𝙱𝚢 𝙳𝚒𝚕𝚒𝚜𝚑𝚊𝚃𝚎𝚌𝚑 ㋡*' },
    { key: 'ALIVE_MSG', value: '*🆆🅴🅻🅲🅾🅼🅴 🆀🆄🅴🅴🅽_🅰🅷🅸🅽🆂🅰-🅼🅳*\n\n *✯ 𝙱𝙾𝚃 𝙽𝙰𝙼𝙴 ✯* - 𝚀𝚞𝚎𝚎𝚗_𝙰𝚑𝚒𝚗𝚜𝚊-𝙼𝙳\n\n *✯ 𝚄𝚂𝙴𝚁 𝙽𝚄𝙼𝙱𝙴𝚁 ✯* - ${ownerNumber} \n\n *✯ 𝙱𝚘𝚝 𝙾𝚠𝚗𝚎𝚛 ✯* - +94754871798\n\n *✯ 𝙱𝚘𝚝 𝙲𝚑𝚊𝚗𝚐𝚎 𝚂𝚎𝚝𝚝𝚒𝚗𝚐𝚜 ✯* - setting\n\n *✯ 𝙱𝚘𝚝 𝙿𝚛𝚎𝚏𝚒𝚡 ✯* - ${prefix} \n\n *✯ 𝚋𝚘𝚝 𝚄𝚙𝚝𝚒𝚖𝚎 ✯* - \n\n *✯ 𝙾𝚠𝚗𝚎𝚛 𝙽𝚊𝚖𝚎 ✯* - ✯𝙳𝚒𝚕𝚒𝚜𝚑𝚊 𝙶𝚒𝚖𝚜𝚑𝚊𝚗✯ \n\n *☫ 𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚍 𝙱𝚢 𝙳𝚒𝚕𝚒𝚜𝚑𝚊𝚃𝚎𝚌𝚑 ㋡*
' },
    { key: 'OWNER_NAME', value: '✯𝙳𝚒𝚕𝚒𝚜𝚑𝚊 𝙶𝚒𝚖𝚜𝚑𝚊𝚗✯' },
    { key: 'OWNER_EMOJI', value: '📌️' },
    { key: 'HEART_REACT', value: 'false' },
    { key: 'OWNER_NUMBER', value: '94754871798' }
];

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB);
        console.log('〽️ongoDB Connected ✅');

        // Create default values if missing
        for (const envVar of defaultEnvVariables) {
            const existingVar = await EnvVar.findOne({ key: envVar.key });
            if (!existingVar) {
                await EnvVar.create(envVar);
                console.log(`🔰 Created default env var: ${envVar.key}`);
            }
        }

        // Override config.js values from database
        const allVars = await EnvVar.find({});
        allVars.forEach(env => {
            config[env.key] = env.value;
        });

        console.log('🔄 Config synced from database ✅');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
