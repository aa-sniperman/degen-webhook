const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 12345;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

app.use(bodyParser.json({
    verify: (req, res, buf, encoding) => {
        const signature = `sha256=${crypto
            .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
            .update(buf)
            .digest('hex')}`;
        req.signature = signature;
    }
}));

function verifySignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (signature !== req.signature) {
        return res.status(403).send('Request body was not signed or verification failed');
    }
    next();
}

app.post('/github-webhook', verifySignature, async (req, res) => {
    const githubEvent = req.headers['x-github-event'];
    const payload = req.body;

    console.log('Received GitHub event:', githubEvent);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const repoName = payload.repository.full_name;
    const pusherName = payload.pusher ? payload.pusher.name : 'N/A';
    const commitMessage = payload.head_commit ? payload.head_commit.message : 'No commit message';
    const commitUrl = payload.head_commit ? payload.head_commit.url : 'No commit URL';
    const senderName = payload.sender ? payload.sender.login : 'N/A';

    const message = `
🔔 *New GitHub Event* 🔔

📦 *Repository*: [${repoName}](${payload.repository.html_url})
🛠 *Event*: ${githubEvent}

👤 *Triggered by*: ${senderName}
📨 *Pushed by*: ${pusherName}

💬 *Commit Message*: ${commitMessage}
🔗 [View Commit](${commitUrl})

🕒 *Timestamp*: ${new Date().toLocaleString()}
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
        });
        res.status(200).send('Event received and message sent to Telegram');
    } catch (error) {
        console.error('Error sending message to Telegram', error);
        res.status(500).send('Error processing event');
    }
});

app.use((err, req, res, next) => {
    if (err) {
        console.error(err.message);
        return res.status(403).send('Request body was not signed or verification failed');
    }
    next();
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
