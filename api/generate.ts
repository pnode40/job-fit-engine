import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // 1. Strict Origin Validation
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.APP_URL || 'http://localhost:3000';

  let isAllowed = false;
  if (!origin) isAllowed = true;
  else if (origin === allowedOrigin) isAllowed = true;
  else if (origin.endsWith('.vercel.app')) isAllowed = true;

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Preflight CORS Request Handling (Critical for Edge)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { dossier, jobDescription } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing API Key' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin } }
      );
    }

    if (!dossier || !jobDescription) {
      return new Response(JSON.stringify({ error: 'Missing dossier or jobDescription' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert executive recruiter, resume writer, and career coach.
I will provide you with a candidate's Master Dossier and a target Job Description.
Your task is to write an ATS-optimized resume, a tailored cover letter, and an Interview Playbook for this specific job, based ONLY on the candidate's actual experience from the dossier. 
CRITICAL RULE: YOU MUST NOT INVENT, ASSUME, OR HALLUCINATE ANY EXPERIENCE.

Format the output in Markdown.
The resume and cover letter should be formatted to fit two pages total, aligned to the job description based on how the candidate's skills fit.

The Interview Playbook MUST include:
1. 5 highly probable, difficult interview questions based specifically on the intersection of the JD and the candidate's dossier.
2. A "Pivot Strategy" for each question, providing specific talking points and showing how to address any gaps by leveraging the candidate's actual experience.

STRATEGIC ALIGNMENT INSTRUCTIONS:
- Deeply analyze the Job Description for key themes, specific terminology, and scale.
- Mirror the language and keywords of the Job Description in the resume bullets, provided it aligns truthfully with the candidate's dossier. 
- Frame the candidate's impact in terms of scale and scope to match the target role.
- Address potential gaps by elevating transferable skills explicitly found in the dossier.
- Focus strictly on high-leverage outcomes and executive impact rather than listing daily duties or tasks. Use punchy, confident, and concise language.
- Apply the "So What" Test (Claim + Mechanism + Proof): Every bullet point must include concrete proof. Do not write "thin" bullets that make claims without evidence.
- Aggressively extract and feature specific metrics from the dossier (e.g., percentages, dollar amounts, team sizes, adoption metrics). Never leave a metric on the table if it proves a claim.
- DO NOT fabricate numbers or companies. If exact numbers are missing from the dossier, use concrete directional language based strictly on the provided text.

CRITICAL FORMATTING INSTRUCTIONS FOR RESUME:
You MUST follow this exact Markdown structure for the entire resume to ensure the PDF renderer works correctly:

# [Candidate Name]
[Contact Line 1: email | phone]
[Contact Line 2: location | linkedin]

## PROFESSIONAL SUMMARY
[A high-impact 3-4 sentence summary of qualifications]

## PROFESSIONAL EXPERIENCE

### [Company Name]
*[Job Title] | [Dates of Employment] | [Location]*
[1-2 sentence overview of the role scope and mandate]
* [Bullet point proving scale/impact]
* [Bullet point proving scale/impact]

### [Company Name 2]
*[Job Title 2] | [Dates of Employment] | [Location]*
... (continue for all roles)

## EDUCATION & CERTIFICATIONS
... (list education)

Candidate Dossier:
${dossier}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumeMarkdown: {
              type: Type.STRING,
              description: "The generated ATS-optimized resume in Markdown format.",
            },
            coverLetterMarkdown: {
              type: Type.STRING,
              description: "The generated tailored cover letter in Markdown format.",
            },
            interviewPlaybookMarkdown: {
              type: Type.STRING,
              description: "The generated interview playbook in Markdown format, containing 5 mock questions and pivot strategies.",
            },
          },
          required: ["resumeMarkdown", "coverLetterMarkdown", "interviewPlaybookMarkdown"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const documents = JSON.parse(text);

    return new Response(
      JSON.stringify(documents),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin
        }
      }
    );

  } catch (error: any) {
    console.error("Generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin } }
    );
  }
}
