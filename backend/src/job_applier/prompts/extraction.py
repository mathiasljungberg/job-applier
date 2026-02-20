SKILL_EXTRACTION_PROMPT = """\
Analyze the following document (a CV or cover letter) and extract all skills mentioned.

For each skill, determine:
- name: The skill name (e.g., "Python", "Project Management", "Docker")
- category: One of: programming_languages, frameworks, devops, soft_skills, domain_knowledge, tools, certifications, other
- proficiency: Inferred level (e.g., "expert", "advanced", "intermediate", "beginner") based on context
- years_experience: Estimated years if mentioned or inferable, otherwise null
- description: Brief context of how the skill is used, based on the document
- tags: Related keywords

Document text:
---
{text}
---

Extract ALL skills, including:
- Programming languages and frameworks
- DevOps tools and platforms
- Soft skills and leadership abilities
- Domain knowledge (industries, methodologies)
- Tools and software
- Certifications and qualifications

Be thorough — extract every skill mentioned or strongly implied.
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
