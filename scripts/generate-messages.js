import http from 'http';

const API_URL = 'http://localhost:3000/api/v1/messages';
const TOKEN = 'super-secret-doodle-token';
const NUM_MESSAGES = 100;

const authors = ['John Doe', 'Alice Smith', 'Bob Johnson', 'Luka', 'Maddie', 'Nina', 'Agent'];
const messages = [
  'Hello everyone!',
  'How is it going?',
  'Just checking in.',
  'Did you see the latest update?',
  'I love this project.',
  'Let us schedule a meeting for tomorrow.',
  'Can someone help me with the frontend?',
  'Looks good to me.',
  'Deploying to production now 🚀',
  'Who wants coffee? ☕'
];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function sendMessage(index) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: `[Msg #${index + 1}] ${getRandomItem(messages)}`,
      author: getRandomItem(authors)
    });

    const req = http.request(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function generateMessages() {
  console.log(`Generating ${NUM_MESSAGES} messages...`);
  
  // Notice: The backend API ignores any 'createdAt' field passed in the POST body
  // and always sets the timestamp to the exact moment of insertion.
  // Therefore, we cannot artificially spread them over the previous 24 hours.
  // We insert them sequentially with a small delay to ensure chronological ordering.
  
  for (let i = 0; i < NUM_MESSAGES; i++) {
    try {
      const result = await sendMessage(i);
      console.log(`Created msg ${i + 1}/${NUM_MESSAGES} - ${result.author}: ${result.message} at ${result.createdAt}`);
      
      // Small delay to prevent overwhelming the server and ensure different timestamps
      await new Promise(res => setTimeout(res, 50));
    } catch (error) {
      console.error(`Error creating message ${i + 1}:`, error.message);
    }
  }
  
  console.log('Done!');
}

generateMessages();
