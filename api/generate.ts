import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { checkRateLimit } from "./_ratelimit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 0. Rate Limiting
  if (!(await checkRateLimit(req, res))) return;

  // 1. Strict Origin Validation
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://job-fit-engine-six-steel.vercel.app',
    'https://job-fit-engine-six.vercel.app',
    'https://job-fit-engine-six-eric-patnoudes-s-projects.vercel.app',
  ].filter(Boolean) as string[];

  const origin = req.headers.origin as string | undefined;
  // Allow same-origin requests (no Origin header) or cross-origin from allowlist
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 2. Preflight CORS Request Handling
  res.setHeader('Access-Control-Allow-Origin', origin ?? 'http://localhost:3000');
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
    if (typeof dossier !== 'string' || typeof jobDescription !== 'string') {
      return res.status(400).json({ error: 'dossier and jobDescription must be strings' });
    }
    const MAX_CHARS = 50_000;
    if (dossier.length > MAX_CHARS || jobDescription.length > MAX_CHARS) {
      return res.status(400).json({ error: `Input exceeds maximum length of ${MAX_CHARS} characters` });
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

**[Company Name]** | *[Job Title] | [Dates of Employment] | [Location]*
* [Bullet point: role scope, mandate, and scale]
* [Bullet point proving scale/impact]
* [Bullet point proving scale/impact]

**[Company Name 2]** | *[Job Title 2] | [Dates of Employment] | [Location]*
... (continue for all roles, always bullets only — never a prose paragraph after the header line)

## EDUCATION & CERTIFICATIONS
... (list education)

CRITICAL FORMATTING INSTRUCTIONS FOR COVER LETTER:
You MUST follow this exact Markdown structure for the entire cover letter to ensure the PDF renderer works correctly:

# [Candidate Name]
[Contact Line 1: email | phone]
[Contact Line 2: location | linkedin]

**[Date]**

**[Hiring Manager Name or "Hiring Team"]**
[Company Name]

**RE: Application for [Job Title]**

Dear [Hiring Manager Name or "Hiring Team"],

[Paragraph 1: Hook and alignment]

[Paragraph 2: Core competency and proof]

[Paragraph 3: Closing and call to action]

Sincerely,

**[Candidate Name]**

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

    // Validate all three documents are non-empty strings
    const docFields = ['resumeMarkdown', 'coverLetterMarkdown', 'interviewPlaybookMarkdown'];
    for (const field of docFields) {
      if (typeof documents[field] !== 'string' || !documents[field].trim()) {
        throw new Error(`Invalid generation response: '${field}' missing or empty`);
      }
    }

    return res.status(200).json(documents);

  } catch (error: any) {
    console.error("Generation error:", error);
    return res.status(500).json({ error: 'Document generation failed. Please try again.' });
  }
}
