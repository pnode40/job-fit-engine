---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
---

# Skill Creator Methodology

A skill for creating new skills and iteratively improving them. 
*Note: This is adapted for the Antigravity architecture. Rather than relying on Python subagent graders, we rely on rapid code-writing, prompt-testing, and human-in-the-loop qualitative iteration.*

## The Core Loop

1. **Capture Intent**: Figure out what the skill is about, when it should trigger, and what the output format is.
2. **Draft the Skill**: Write the initial `SKILL.md` (keep it lean, explain the *why*, avoid brittle "MUSTs").
3. **Test with User**: Create realistic test prompts and try running them. 
4. **Evaluate**: With the user, evaluate the outputs qualitatively. 
5. **Iterate**: Refine the skill based on feedback until satisfied.

## Writing Style Guide for Skills
*   **Explain the why**: Try to explain to the model *why* things are important in lieu of heavy-handed musty MUSTs. Use theory of mind.
*   **Progressive Disclosure**: Keep `SKILL.md` under 500 lines. Reference external files (`scripts/`, `assets/`) if it gets too bloated.
*   **Examples**: Provide strict Input/Output formatting examples.

## How to Test
1. Write 2-3 realistic user prompts (e.g., "redesign my hero section to look like vercel").
2. Execute the task following the new `SKILL.md`.
3. Present the result to the user.
4. Ask: "How does this look? Anything you'd change?"
5. Update `SKILL.md` based on feedback.
