SKILL_EXTRACTION_PROMPT = """\
Extract all skills from this document. For each skill provide:
- name: Skill name in English (e.g., "Python", "Project Management")
- category: One of: programming_languages, frameworks, devops, soft_skills, domain_knowledge, tools, certifications, other

Document:
---
{text}
---
"""

JOB_EXTRACTION_PROMPT = """\
Analyze the following job posting and extract structured information.

Job posting text:
---
{text}
---

Extract:
- title: The job title
- company: The company name
- location: The job location
- description: A brief summary of the role
- required_skills: Skills that are explicitly required (with name, required=true, and category)
- preferred_skills: Skills that are preferred/nice-to-have (with name, required=false, and category)
- qualifications: List of educational/professional qualifications
- responsibilities: List of key responsibilities
- salary: Salary info if mentioned
- deadline: Application deadline if mentioned

For skill categories, use: programming_languages, frameworks, devops, soft_skills, domain_knowledge, tools, certifications, other
"""
