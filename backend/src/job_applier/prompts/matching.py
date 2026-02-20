SKILL_MATCHING_PROMPT = """\
You are a skill matching expert. Compare job requirements against a candidate's skill library.

Job Requirements:
---
{requirements}
---

Candidate Skills:
---
{skills}
---

For each job requirement, determine:
- requirement: The original requirement name
- matched_skill_id: The ID of the best matching skill from the candidate's library (empty string if no match)
- matched_skill_name: The name of the matched skill (empty string if no match)
- match_quality: "strong", "partial", or "none"
- explanation: Brief explanation of the match or gap

Consider semantic similarity — e.g., "React.js" matches "React", "CI/CD" matches "GitHub Actions", etc.
Be thorough in finding matches even when terminology differs.
"""
