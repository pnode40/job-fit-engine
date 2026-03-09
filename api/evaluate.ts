import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Strict Origin Validation
  const origin = req.headers.origin || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.APP_URL || 'http://localhost:3000';

  let isAllowed = false;
  if (!origin) isAllowed = true;
  else if (origin === allowedOrigin) isAllowed = true;
  else if (origin.endsWith('.vercel.app')) isAllowed = true;

  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 2. Preflight CORS Request Handling
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { dossier, jobDescription } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    if (!dossier || !jobDescription) {
      return res.status(400).json({ error: 'Missing dossier or jobDescription' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert career coach and technical recruiter performing a strict, forensic Fit Analysis.
I will provide you with a candidate's Master Dossier (their verified skills, experience, and background) and a target Job Description.
Your task is to evaluate the exact fit between the candidate and the job.

CRITICAL RULES:
1. ZERO HALLUCINATION: You are strictly forbidden from assuming, inventing, or hallucinating experience. If a requirement in the Job Description is not explicitly mentioned or clearly demonstrated in the Dossier, you MUST mark it as a 'gap' (badFitReason).
2. IMPLICIT TRANSLATION: You may translate explicit achievements into required skills if the connection is undeniable (e.g., managing a $5M P&L implies Financial Acumen), but you must explicitly state the source of your translation in your reasoning.
3. CLAIM + PROOF STRUCTURE: Every single 'goodFitReason' must follow a Claim + Proof structure. For example: "Candidate meets the [Skill] requirement, proven by their experience [Exact Metric/Achievement from Dossier]." Do not write generic praise.
4. BE RUTHLESS: This is a pro-grade platform. If the candidate is a weak fit, say so clearly. Do not inflate the match score.

Candidate Dossier:
${dossier}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 representing how well the candidate fits the job description.",
            },
            goodFitReasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Reasons why the candidate is a good fit for the role based on their dossier.",
            },
            badFitReasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Reasons why the candidate might not be a good fit, or areas where they lack experience.",
            },
            recommendation: {
              type: Type.STRING,
              description: "Whether the candidate should apply or not. Must be exactly 'APPLY' or 'DO_NOT_APPLY'.",
            },
            recommendationReasoning: {
              type: Type.STRING,
              description: "A short paragraph explaining the final recommendation.",
            },
            keywords: {
              type: Type.ARRAY,
              description: "Top 10-15 hard skills or keywords extracted from the JD, and whether the candidate's dossier matches them.",
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING, description: "The skill or keyword." },
                  matched: { type: Type.BOOLEAN, description: "True if the candidate's dossier explicitly or implicitly demonstrates this skill." }
                },
                required: ["skill", "matched"]
              }
            }
          },
          required: ["matchScore", "goodFitReasons", "badFitReasons", "recommendation", "recommendationReasoning", "keywords"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const evaluation = JSON.parse(text);

    return res.status(200).json(evaluation);

  } catch (error: any) {
    console.error("Evaluation error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
