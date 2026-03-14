import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[];

  const origin = req.headers.origin as string | undefined;
  const isAllowed = !origin || allowedOrigins.includes(origin);
  if (!isAllowed) return res.status(403).json({ error: 'Forbidden' });

  res.setHeader('Access-Control-Allow-Origin', origin ?? 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { fixture, engineOutput } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });
    if (!fixture || !engineOutput) return res.status(400).json({ error: 'Missing fixture or engineOutput' });

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an evaluation judge for a job fit recommendation engine. You will be given a resume, a job description, the expected fit level, and the engine's output. Return ONLY a valid JSON object with no markdown, no backticks, no preamble. The JSON must have exactly these fields:
- fitLevelMatch: boolean (true if engine's assessed fit matches expectedFit)
- gapSpecificity: number 1-5 (are identified gaps specific to this JD or generic?)
- recommendationQuality: number 1-5 (are recommendations actionable and tailored?)
- scoreReasonableness: number 1-5 (is the overall score reasonable for this pair?)
- judgeRationale: string (1-2 sentence explanation of the scores)

EXPECTED FIT: ${fixture.expectedFit}
ENGINE RECOMMENDATION: ${engineOutput.recommendation}
ENGINE MATCH SCORE: ${engineOutput.matchScore}
ENGINE SKILLS SCORE: ${engineOutput.skillsScore}
ENGINE SENIORITY SCORE: ${engineOutput.seniorityScore}
ENGINE DOMAIN SCORE: ${engineOutput.domainScore}
ENGINE GOOD FIT REASONS: ${JSON.stringify(engineOutput.goodFitReasons)}
ENGINE BAD FIT REASONS: ${JSON.stringify(engineOutput.badFitReasons)}
ENGINE LEVELING ANALYSIS: ${engineOutput.levelingAnalysis}

RESUME:
${fixture.resume}

JOB DESCRIPTION:
${fixture.jobDescription}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let rawText = (response.text ?? '').trim();
    // Strip accidental markdown backticks
    rawText = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    const judgeOutput = JSON.parse(rawText);

    // Validate shape
    if (
      typeof judgeOutput.fitLevelMatch !== 'boolean' ||
      typeof judgeOutput.gapSpecificity !== 'number' ||
      typeof judgeOutput.recommendationQuality !== 'number' ||
      typeof judgeOutput.scoreReasonableness !== 'number' ||
      typeof judgeOutput.judgeRationale !== 'string'
    ) {
      throw new Error('Judge returned an unexpected JSON shape');
    }

    return res.status(200).json(judgeOutput);

  } catch (error: any) {
    console.error('Eval judge error:', error);
    return res.status(500).json({ error: error.message || 'Judge call failed' });
  }
}
