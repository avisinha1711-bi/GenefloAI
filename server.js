// api/chat.js (Vercel/Netlify function)
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    
    // Your existing chat logic here
    const response = await generateEnhancedResponse(message);
    
    res.status(200).json(response);
  }
}
