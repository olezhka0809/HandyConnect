const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1/models'
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']

function apiKey() {
  const k = process.env.GEMINI_API_KEY
  if (!k) throw new Error('GEMINI_API_KEY lipsă din .env')
  return k
}

function extractText(responseJson) {
  return responseJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

async function callGeminiWithModel(model, parts, systemInstruction = null) {
  const url  = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey()}`

  // Dacă există system instruction, o injectăm ca primul part de tip text
  // (v1 API nu suportă câmpul system_instruction separat)
  const allParts = systemInstruction
    ? [{ text: `[CONTEXT EXPERT]\n${systemInstruction}\n[/CONTEXT EXPERT]\n\n` }, ...parts]
    : parts

  const requestBody = { contents: [{ parts: allParts }] }

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(requestBody),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`)
  const text = extractText(json)
  if (!text) throw new Error('Răspuns gol de la Gemini')
  return text
}

async function callGemini(parts, systemInstruction = null) {
  let lastErr
  for (const model of MODELS) {
    try {
      return await callGeminiWithModel(model, parts, systemInstruction)
    } catch (e) {
      lastErr = e
      const isRetryable = e.message.includes('high demand') || e.message.includes('429') || e.message.includes('503')
      if (!isRetryable) throw e
    }
  }
  throw lastErr
}

async function generateText(prompt, systemInstruction = null) {
  return callGemini([{ text: prompt }], systemInstruction)
}

async function generateJSON(prompt, files = [], systemInstruction = null) {
  const parts = [
    ...files.map(f => ({
      inlineData: {
        data:     f.buffer.toString('base64'),
        mimeType: f.mimetype,
      }
    })),
    { text: prompt },
  ]

  const text = await callGemini(parts, systemInstruction)

  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, null]
  const raw   = match[1] ?? text.trim()

  try {
    return JSON.parse(raw)
  } catch {
    const obj = raw.match(/\{[\s\S]*\}/)
    if (!obj) throw new Error('Răspunsul AI nu conține JSON valid')
    return JSON.parse(obj[0])
  }
}

module.exports = { generateText, generateJSON }
