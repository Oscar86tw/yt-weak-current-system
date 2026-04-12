import axios from 'axios';
import { logInfo, logError } from '../utils/logger.js';

export async function sendLine(userId, msg) {
  if (!process.env.LINE_TOKEN || process.env.LINE_TOKEN === 'CHANGE_ME') {
    logInfo('LINE skipped because LINE_TOKEN is empty');
    return;
  }

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages: [{ type: 'text', text: msg }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LINE_TOKEN}`
        },
        timeout: 10000
      }
    );
  } catch (error) {
    logError('LINE push failed', { detail: error.message });
  }
}
