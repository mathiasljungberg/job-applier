CV_GENERATION_PROMPT = """\
Generate a professional CV/resume tailored to the following job posting.

Job Title: {job_title}
Company: {company}

Job Requirements:
{requirements}

Candidate Skills & Experience:
{skills}

Instructions:
- Highlight skills that match the job requirements
- Use professional, concise language
- Tone: {tone}
- Language: {language}
{char_limit_instruction}

Generate the CV content in clean HTML format suitable for PDF conversion.
Use semantic HTML tags (h1, h2, h3, p, ul, li) for structure.
Do NOT include <html>, <head>, or <body> tags — just the content.
Include sections: Contact (placeholder), Summary, Skills, Experience, Education.
"""

LETTER_GENERATION_PROMPT = """\
Write a professional cover letter tailored to the following job posting.

Job Title: {job_title}
Company: {company}

Job Requirements:
{requirements}

Candidate Skills & Experience:
{skills}

Instructions:
- Address how the candidate's skills match the requirements
- Show enthusiasm for the role and company
- Tone: {tone}
- Language: {language}
{char_limit_instruction}

Generate the cover letter in clean HTML format suitable for PDF conversion.
Use semantic HTML tags (h1, h2, p) for structure.
Do NOT include <html>, <head>, or <body> tags — just the content.
"""
