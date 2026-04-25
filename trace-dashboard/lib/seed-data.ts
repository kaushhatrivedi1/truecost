// seed-data.ts — Hardcoded seed data for the dashboard
// No API keys or credentials in this file.

import type { Session, TeamMember } from './data-utils';
export type { TeamMember } from './data-utils';

export const PERSONAL_SEED_DATA: Session[] = [
  // --- chatgpt (6 sessions) ---
  { id: 's01', timestamp: '2025-06-01T08:12:00Z', platform_id: 'chatgpt', model_id: 'gpt-4o', tokens: 120, carbon_mg: 11.97, water_ml: 1.27, score: 92, grade: 'A', intent: 'coding', prompt_preview: 'Write a TypeScript function that validates email addresses using a regex' },
  { id: 's02', timestamp: '2025-06-02T09:30:00Z', platform_id: 'chatgpt', model_id: 'gpt-4o', tokens: 250, carbon_mg: 24.94, water_ml: 2.65, score: 85, grade: 'B', intent: 'writing', prompt_preview: 'Draft a professional email to a client about project timeline changes' },
  { id: 's03', timestamp: '2025-06-03T10:45:00Z', platform_id: 'chatgpt', model_id: 'gpt-4o-mini', tokens: 180, carbon_mg: 10.26, water_ml: 1.91, score: 78, grade: 'C', intent: 'research', prompt_preview: 'Explain the difference between REST and GraphQL APIs' },
  { id: 's04', timestamp: '2025-06-04T14:20:00Z', platform_id: 'chatgpt', model_id: 'gpt-4', tokens: 420, carbon_mg: 57.86, water_ml: 4.45, score: 65, grade: 'D', intent: 'exploratory', prompt_preview: 'Brainstorm ideas for a mobile app that helps people reduce food waste' },
  { id: 's05', timestamp: '2025-06-05T16:00:00Z', platform_id: 'chatgpt', model_id: 'gpt-3.5-turbo', tokens: 550, carbon_mg: 44.41, water_ml: 5.83, score: 52, grade: 'F', intent: 'general', prompt_preview: 'Can you please help me with something I need you to do for me about stuff' },
  { id: 's06', timestamp: '2025-06-06T11:15:00Z', platform_id: 'chatgpt', model_id: 'gpt-4o', tokens: 95, carbon_mg: 9.48, water_ml: 1.01, score: 96, grade: 'A', intent: 'coding', prompt_preview: 'Refactor this function to use async/await instead of callbacks' },

  // --- claude (5 sessions) ---
  { id: 's07', timestamp: '2025-06-07T08:00:00Z', platform_id: 'claude', model_id: 'claude-3-5-sonnet', tokens: 200, carbon_mg: 19.00, water_ml: 2.12, score: 88, grade: 'B', intent: 'coding', prompt_preview: 'Implement a binary search algorithm in Python with type hints' },
  { id: 's08', timestamp: '2025-06-08T13:30:00Z', platform_id: 'claude', model_id: 'claude-3-opus', tokens: 310, carbon_mg: 45.64, water_ml: 3.29, score: 73, grade: 'C', intent: 'writing', prompt_preview: 'Write a blog post introduction about sustainable technology trends' },
  { id: 's09', timestamp: '2025-06-09T15:45:00Z', platform_id: 'claude', model_id: 'claude-3-haiku', tokens: 80, carbon_mg: 3.42, water_ml: 0.85, score: 94, grade: 'A', intent: 'research', prompt_preview: 'What is the current state of quantum computing in 2025?' },
  { id: 's10', timestamp: '2025-06-10T10:00:00Z', platform_id: 'claude', model_id: 'claude-3-sonnet', tokens: 480, carbon_mg: 50.16, water_ml: 5.09, score: 61, grade: 'D', intent: 'exploratory', prompt_preview: 'Suggest creative ways to use AI in environmental conservation projects' },
  { id: 's11', timestamp: '2025-06-11T17:20:00Z', platform_id: 'claude', model_id: 'claude-3-5-sonnet', tokens: 600, carbon_mg: 57.00, water_ml: 6.36, score: 48, grade: 'F', intent: 'general', prompt_preview: 'I would like you to kindly help me with various things and stuff please' },

  // --- gemini (5 sessions) ---
  { id: 's12', timestamp: '2025-06-12T09:10:00Z', platform_id: 'gemini', model_id: 'gemini-1.5-pro', tokens: 150, carbon_mg: 18.53, water_ml: 1.59, score: 91, grade: 'A', intent: 'coding', prompt_preview: 'Create a React hook for debouncing input values with TypeScript generics' },
  { id: 's13', timestamp: '2025-06-13T11:40:00Z', platform_id: 'gemini', model_id: 'gemini-1.5-flash', tokens: 220, carbon_mg: 11.50, water_ml: 2.33, score: 82, grade: 'B', intent: 'research', prompt_preview: 'Compare the environmental impact of different cloud providers' },
  { id: 's14', timestamp: '2025-06-14T14:55:00Z', platform_id: 'gemini', model_id: 'gemini-2.0', tokens: 350, carbon_mg: 29.93, water_ml: 3.71, score: 70, grade: 'C', intent: 'writing', prompt_preview: 'Draft a technical documentation page for a REST API endpoint' },
  { id: 's15', timestamp: '2025-06-15T16:30:00Z', platform_id: 'gemini', model_id: 'gemini-1.5-pro', tokens: 500, carbon_mg: 61.75, water_ml: 5.30, score: 63, grade: 'D', intent: 'general', prompt_preview: 'Could you please help me understand some kind of thing about databases' },
  { id: 's16', timestamp: '2025-06-16T08:45:00Z', platform_id: 'gemini', model_id: 'gemini-1.5-flash', tokens: 100, carbon_mg: 5.23, water_ml: 1.06, score: 90, grade: 'A', intent: 'exploratory', prompt_preview: 'What if we could use AI to predict and prevent wildfires?' },

  // --- perplexity (5 sessions) ---
  { id: 's17', timestamp: '2025-06-17T10:20:00Z', platform_id: 'perplexity', model_id: 'default', tokens: 130, carbon_mg: 12.97, water_ml: 1.38, score: 87, grade: 'B', intent: 'research', prompt_preview: 'Summarise the latest research on carbon capture technology' },
  { id: 's18', timestamp: '2025-06-18T12:00:00Z', platform_id: 'perplexity', model_id: 'default', tokens: 280, carbon_mg: 27.93, water_ml: 2.97, score: 76, grade: 'C', intent: 'coding', prompt_preview: 'How does the JavaScript event loop handle microtasks vs macrotasks?' },
  { id: 's19', timestamp: '2025-06-19T14:15:00Z', platform_id: 'perplexity', model_id: 'default', tokens: 90, carbon_mg: 8.98, water_ml: 0.95, score: 93, grade: 'A', intent: 'research', prompt_preview: 'Define the key principles of zero-trust security architecture' },
  { id: 's20', timestamp: '2025-06-20T09:50:00Z', platform_id: 'perplexity', model_id: 'default', tokens: 450, carbon_mg: 44.89, water_ml: 4.77, score: 58, grade: 'F', intent: 'writing', prompt_preview: 'Can you please write me something about whatever topic you think is good' },
  { id: 's21', timestamp: '2025-06-21T15:30:00Z', platform_id: 'perplexity', model_id: 'default', tokens: 170, carbon_mg: 16.96, water_ml: 1.80, score: 81, grade: 'B', intent: 'exploratory', prompt_preview: 'Explore possibilities for using machine learning in agriculture' },

  // --- mistral (5 sessions) ---
  { id: 's22', timestamp: '2025-06-22T08:30:00Z', platform_id: 'mistral', model_id: 'mistral-large', tokens: 160, carbon_mg: 18.24, water_ml: 1.70, score: 84, grade: 'B', intent: 'coding', prompt_preview: 'Implement a rate limiter middleware in Express.js using token bucket' },
  { id: 's23', timestamp: '2025-06-23T11:00:00Z', platform_id: 'mistral', model_id: 'mistral-small', tokens: 300, carbon_mg: 18.53, water_ml: 3.18, score: 72, grade: 'C', intent: 'writing', prompt_preview: 'Write a concise README section explaining the project architecture' },
  { id: 's24', timestamp: '2025-06-24T13:45:00Z', platform_id: 'mistral', model_id: 'mistral-large', tokens: 110, carbon_mg: 12.54, water_ml: 1.17, score: 95, grade: 'A', intent: 'research', prompt_preview: 'Overview of WebAssembly use cases in modern web development' },
  { id: 's25', timestamp: '2025-06-25T16:10:00Z', platform_id: 'mistral', model_id: 'mistral-small', tokens: 520, carbon_mg: 32.11, water_ml: 5.51, score: 55, grade: 'F', intent: 'general', prompt_preview: 'I need you to do something for me about various things and stuff etc' },
  { id: 's26', timestamp: '2025-06-26T10:30:00Z', platform_id: 'mistral', model_id: 'mistral-large', tokens: 200, carbon_mg: 22.80, water_ml: 2.12, score: 67, grade: 'D', intent: 'exploratory', prompt_preview: 'Brainstorm ideas for reducing energy consumption in data centres' },

  // --- copilot (4 sessions) ---
  { id: 's27', timestamp: '2025-06-27T09:00:00Z', platform_id: 'copilot', model_id: 'default', tokens: 140, carbon_mg: 13.97, water_ml: 1.48, score: 89, grade: 'B', intent: 'coding', prompt_preview: 'Generate unit tests for a sorting utility function in Jest' },
  { id: 's28', timestamp: '2025-06-28T12:20:00Z', platform_id: 'copilot', model_id: 'default', tokens: 260, carbon_mg: 25.94, water_ml: 2.76, score: 74, grade: 'C', intent: 'research', prompt_preview: 'Explain how container orchestration works with Kubernetes' },
  { id: 's29', timestamp: '2025-06-29T14:40:00Z', platform_id: 'copilot', model_id: 'default', tokens: 380, carbon_mg: 37.91, water_ml: 4.03, score: 62, grade: 'D', intent: 'writing', prompt_preview: 'Draft a pull request description for a feature branch with code changes' },
  { id: 's30', timestamp: '2025-06-30T17:00:00Z', platform_id: 'copilot', model_id: 'default', tokens: 75, carbon_mg: 7.48, water_ml: 0.80, score: 97, grade: 'A', intent: 'coding', prompt_preview: 'Fix the off-by-one error in this array slicing function' },
];

export const TEAM_SEED_DATA: TeamMember[] = [
  { name: 'Alex Chen',    prompts: 18, avgGrade: 'B', tokens: 74, topIntent: 'coding',      intentPct: 67 },
  { name: 'Priya Sharma', prompts: 12, avgGrade: 'C', tokens: 58, topIntent: 'research',    intentPct: 58 },
  { name: 'Marcus Webb',  prompts: 9,  avgGrade: 'D', tokens: 62, topIntent: 'exploratory', intentPct: 78 },
  { name: 'Sofia Reyes',  prompts: 15, avgGrade: 'A', tokens: 43, topIntent: 'writing',     intentPct: 60 },
  { name: 'James Park',   prompts: 7,  avgGrade: 'B', tokens: 39, topIntent: 'coding',      intentPct: 57 },
];
