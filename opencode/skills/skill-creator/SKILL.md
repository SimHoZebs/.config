---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, or optimize a skill's description for better triggering accuracy.
---

# Skill Creator

Guide for creating, testing, and iteratively improving skills.

## Creating a Skill

### 1. User Interview

Ask 3-5 questions:
- What should this skill enable the agent to do end-to-end?
- When should this skill trigger (specific user phrases, tasks)?
- What output format and quality bar are expected?
- What workflow steps must be preserved vs. where can the agent improvise?

### 2. Write the SKILL.md

Structure:
```
skill-name/
  SKILL.md    (required: YAML frontmatter + markdown instructions)
```

Frontmatter fields:
- `name` (required): lowercase alphanumeric with single hyphens. Must match directory name.
- `description` (required): Primary triggering mechanism. Include what the skill does AND specific contexts for when to use it. Make descriptions slightly "pushy" — agents tend to undertrigger.
- `license` (optional)
- `compatibility` (optional)

### 3. Content Structure

Write clear, actionable instructions:

- **Purpose**: What the skill does
- **Trigger Conditions**: When to load it
- **Workflow**: Step-by-step instructions
- **Output Format**: Be precise about the expected output
- **Verification**: How to verify the work

### 4. Skill Writing Guide

- Keep each skill scoped to one job
- Use code blocks and tables for structured content
- Include "read actual code" guardrails — agents should verify against real files, not guess
- Define exact output format with examples
- Add verification steps

## Description Optimization

The description field is the primary triggering mechanism. After creating a skill, optimize it:

1. Generate eval queries — 20 prompts split 60/40 into should-trigger and should-not-trigger
2. Test: does the current description cause the agent to load the skill correctly?
3. Iterate: improve the description, retest
4. Pick the best-performing description

## Evaluation

Test skills against realistic prompts the user would actually type. For each test case:
- Run with the skill and without (baseline)
- Is output quality better with the skill?
- Does the skill trigger when it should, and stay quiet when it shouldn't?
