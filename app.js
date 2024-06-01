const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 12345;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(bodyParser.json());

app.post('/github-webhook', async (req, res) => {
    const githubEvent = req.headers['x-github-event'];
    const payload = req.body;

    // Extract necessary details
    const repoName = payload.repository.full_name;
    const pusherName = payload.pusher ? payload.pusher.name : 'N/A';
    const commitMessage = payload.head_commit ? payload.head_commit.message : 'No commit message';
    const commitUrl = payload.head_commit ? payload.head_commit.url : 'No commit URL';
    const senderName = payload.sender ? payload.sender.login : 'N/A';

    // Construct a decorated message to send to Telegram
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
            parse_mode: 'Markdown' // Using Markdown to format the message
        });
        res.status(200).send('Event received and message sent to Telegram');
    } catch (error) {
        console.error('Error sending message to Telegram', error);
        res.status(500).send('Error processing event');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
