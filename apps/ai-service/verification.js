// Use native fetch (Node 18+)

async function verifyChat() {
  const url = 'http://127.0.0.1:5174/api/ai/chat';
  const userId = 'test_user_verification';

  console.log(`Testing Chat Endpoint: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId, // Sending direct header, might need auth token if middleware enforces it
      },
      body: JSON.stringify({
        prompt: 'What is my current balance?',
        userId: userId, // Also in body as fallback
      }),
    });

    console.log(`Response Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response Body: ${text.substring(0, 500)}...`);

    if (response.ok) {
      console.log('SUCCESS: Chat endpoint verification passed.');

      // Extract Session ID
      const data = JSON.parse(text);
      if (data.sessionId) {
        console.log(`Verifying Session persistence for ID: ${data.sessionId}`);

        // Direct call to AI service on port 3001
        const checkResponse = await fetch(
          `http://127.0.0.1:3001/v1/chat/sessions/${data.sessionId}`,
          {
            headers: { 'x-user-id': userId },
          }
        );

        if (checkResponse.ok) {
          const sessionData = await checkResponse.json();
          console.log(
            'SUCCESS: Session retrieved from database:',
            sessionData.session.title
          );
        } else {
          console.log(
            'FAILURE: Could not retrieve session from database.',
            checkResponse.status
          );
        }
      }
    } else {
      console.log('FAILURE: Chat endpoint returned error.');
    }
  } catch (error) {
    console.error('ERROR: Failed to connect', error);
  }
}

verifyChat();
