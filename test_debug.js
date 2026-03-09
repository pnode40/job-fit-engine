import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function testLocally() {
    console.log("--- TESTING RUNNING SERVER ---");
    try {
        const res = await fetch("http://localhost:3000/api/evaluate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Origin": "http://localhost:3000"
            },
            body: JSON.stringify({ dossier: "test experience", jobDescription: "test job" })
        });
        console.log("Running server status for localhost:3000:", res.status);
        console.log("Running server body:", await res.text());
    } catch (e) {
        console.error("Server fetch failed", e);
    }
}

async function testGemini() {
    console.log("--- TESTING GEMINI API DIRECTLY ---");
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.log("API Key missing from .env");
            return;
        }
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: "Say hello",
        });
        console.log("Gemini generation successful. Output:", response.text);
    } catch (e) {
        console.error("Gemini API call failed:", e.message);
    }
}

async function run() {
    await testLocally();
    await testGemini();
}

run();
