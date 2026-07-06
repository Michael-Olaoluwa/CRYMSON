const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

const SYSTEM_PROMPT = `You are an academic task detection engine. Analyze the given text and extract any tasks, deadlines, assignments, exams, or grade weights mentioned.

Return a JSON object with this exact structure:
{
  "detections": [
    {
      "type": "task" | "deadline" | "grade_weight" | "exam",
      "title": "Clear task title",
      "courseTag": "Course code if mentioned, otherwise empty string",
      "dueAt": "ISO date string if mentioned, otherwise empty string",
      "priority": "high" | "medium" | "low",
      "confidence": 0.0 to 1.0,
      "sourceText": "The exact sentence from the input that triggered this detection"
    }
  ]
}

Rules:
- Only extract items that are clearly actionable tasks or deadlines
- Set confidence to 0.9+ if the date/time/course are explicitly stated
- Set confidence to 0.5-0.8 if the intent is clear but details are vague
- Set confidence below 0.5 if the task is ambiguous
- For grade weights (e.g. "worth 30%"), use type "grade_weight"
- Parse relative dates like "tomorrow", "next week", "by Friday" into actual dates based on the current date
- If no tasks/deadlines are found, return { "detections": [] }
- Do NOT include any text outside the JSON object`;

async function analyzeWithOpenAI(text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Current date and time: ${new Date().toISOString()}\n\nText to analyze:\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse JSON from OpenAI response');

  return JSON.parse(jsonMatch[0]);
}

async function analyzeWithGemini(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nCurrent date and time: ${new Date().toISOString()}\n\nText to analyze:\n${text}`,
          }],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini returned empty response');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse JSON from Gemini response');

  return JSON.parse(jsonMatch[0]);
}

async function analyzeText(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { detections: [] };
  }

  if (!AI_API_KEY) {
    return { detections: [], _note: 'No AI API key configured' };
  }

  const provider = AI_PROVIDER;
  let result;

  if (provider === 'openai') {
    result = await analyzeWithOpenAI(text);
  } else {
    result = await analyzeWithGemini(text);
  }

  return {
    detections: Array.isArray(result.detections) ? result.detections : [],
  };
}

module.exports = { analyzeText };
