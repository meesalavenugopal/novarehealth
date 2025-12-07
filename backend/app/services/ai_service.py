"""
AI Service for NovareHealth
Provides AI-powered features for doctor registration and profile enhancement
"""
from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings


class AIService:
    """AI-powered service for NovareHealth"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE
    
    async def generate_doctor_bio(
        self,
        specialization: str,
        experience_years: int,
        education: List[Dict[str, str]],
        languages: List[str],
        additional_info: Optional[str] = None
    ) -> str:
        """
        Generate a professional bio for a doctor based on their profile information.
        """
        education_str = ", ".join([
            f"{edu.get('degree', '')} from {edu.get('institution', '')} ({edu.get('year', '')})"
            for edu in education
        ]) if education else "Not specified"
        
        languages_str = ", ".join(languages) if languages else "Not specified"
        
        prompt = f"""Generate a professional, warm, and trustworthy bio for a doctor with the following details:

Specialization: {specialization}
Years of Experience: {experience_years} years
Education: {education_str}
Languages: {languages_str}
Additional Information: {additional_info or 'None provided'}

Requirements:
- Write in first person
- Keep it between 100-150 words
- Highlight expertise and patient-centered approach
- Make it warm and approachable for African healthcare context
- Focus on building trust with patients
- Include a mention of commitment to accessible healthcare

Generate only the bio text, no additional commentary."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional medical copywriter helping doctors create compelling bios for a telemedicine platform in Africa. Write in a warm, professional tone that builds trust with patients."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    
    async def suggest_consultation_fee(
        self,
        specialization: str,
        experience_years: int,
        education: List[Dict[str, str]],
        country: str = None
    ) -> Dict[str, Any]:
        """
        Suggest appropriate consultation fees based on doctor's profile and market rates.
        """
        # Use configured country if not provided
        if country is None:
            country = settings.DEFAULT_COUNTRY_NAME
        
        currency = settings.DEFAULT_CURRENCY
        
        prompt = f"""Based on the following doctor profile and the healthcare market in {country}, suggest appropriate consultation fees in {currency}:

Specialization: {specialization}
Years of Experience: {experience_years} years
Education Level: {len(education) if education else 0} qualifications

Consider:
- Average market rates for telemedicine in Africa
- The specialization premium
- Experience level premium
- Accessibility for patients

Respond in JSON format only:
{{
    "suggested_fee": <number>,
    "min_fee": <number>,
    "max_fee": <number>,
    "currency": "{currency}",
    "reasoning": "<brief explanation>"
}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a healthcare economics expert familiar with African telemedicine markets. Provide realistic fee suggestions in JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=300,
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        
        import json
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {
                "suggested_fee": 500,
                "min_fee": 300,
                "max_fee": 1500,
                "currency": "MZN",
                "reasoning": "Default suggestion based on market averages"
            }
    
    async def enhance_profile_text(
        self,
        text: str,
        text_type: str = "bio"
    ) -> str:
        """
        Enhance and improve doctor's profile text (bio, about section, etc.)
        """
        prompt = f"""Improve the following doctor's {text_type} to make it more professional and engaging while keeping the core message:

Original text:
{text}

Requirements:
- Keep the same length (or slightly shorter)
- Maintain factual accuracy
- Improve clarity and professionalism
- Make it more patient-friendly
- Ensure it sounds natural, not AI-generated

Provide only the enhanced text, no commentary."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional medical copywriter. Enhance the text while maintaining authenticity."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.6
        )
        
        return response.choices[0].message.content.strip()
    
    async def rephrase_bio(
        self,
        current_bio: str,
        style: str = "professional"
    ) -> str:
        """
        Rephrase doctor's bio in a different style while keeping the same information.
        """
        style_descriptions = {
            "professional": "formal, authoritative, and clinical",
            "friendly": "warm, approachable, and conversational",
            "concise": "brief, to-the-point, and efficient"
        }
        
        style_desc = style_descriptions.get(style, style_descriptions["professional"])
        
        prompt = f"""Rephrase the following doctor's bio in a {style_desc} tone while keeping ALL the same information:

Current bio:
{current_bio}

Requirements:
- Keep all factual information (name, experience, specialization, etc.)
- Change the writing style to be more {style_desc}
- Keep similar length (100-150 words)
- Make it sound natural and authentic
- Focus on building patient trust

Provide only the rephrased bio, no commentary."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional medical copywriter. Rephrase the text while maintaining all factual content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.8
        )
        
        return response.choices[0].message.content.strip()
    
    async def generate_bio_with_custom_input(
        self,
        specialization: str,
        experience_years: int,
        education: List[Dict[str, str]],
        languages: List[str],
        custom_details: str
    ) -> str:
        """
        Generate a professional bio incorporating custom details provided by the doctor.
        """
        education_str = ", ".join([
            f"{edu.get('degree', '')} from {edu.get('institution', '')} ({edu.get('year', '')})"
            for edu in education
        ]) if education else "Not specified"
        
        languages_str = ", ".join(languages) if languages else "Not specified"
        
        prompt = f"""Generate a professional, warm, and trustworthy bio for a doctor with the following details:

Specialization: {specialization}
Years of Experience: {experience_years} years
Education: {education_str}
Languages: {languages_str}

IMPORTANT - The doctor wants to highlight these specific points:
{custom_details}

Requirements:
- Write in first person
- Keep it between 100-150 words
- MUST incorporate the doctor's specific points naturally
- Highlight expertise and patient-centered approach
- Make it warm and approachable for African healthcare context
- Focus on building trust with patients

Generate only the bio text, no additional commentary."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional medical copywriter helping doctors create compelling bios for a telemedicine platform in Africa. Incorporate the doctor's personal touches while maintaining professional quality."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    
    async def get_registration_tips(
        self,
        specialization: str,
        step: int = 1
    ) -> Dict[str, Any]:
        """
        Get AI-powered tips for doctor registration based on specialization and current step.
        """
        step_names = {
            1: "Specialty Selection",
            2: "Professional Information",
            3: "Education & Qualifications",
            4: "Document Upload"
        }
        
        step_name = step_names.get(step, "Registration")
        
        prompt = f"""Provide helpful tips for a {specialization} doctor completing the "{step_name}" step of their registration on a telemedicine platform.

Give 3 concise, actionable tips specific to this step and specialization.

Respond in JSON format:
{{
    "tips": [
        {{
            "title": "<short title>",
            "description": "<1-2 sentence tip>"
        }}
    ],
    "encouragement": "<brief encouraging message>"
}}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful onboarding assistant for a healthcare platform. Provide practical, encouraging guidance."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=400,
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        import json
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {
                "tips": [
                    {"title": "Be Detailed", "description": "Provide comprehensive information to build patient trust."},
                    {"title": "Be Authentic", "description": "Share your genuine passion for healthcare."},
                    {"title": "Highlight Experience", "description": "Emphasize your unique skills and experience."}
                ],
                "encouragement": "You're doing great! Complete your profile to start helping patients."
            }
    
    async def chat_assistant(
        self,
        message: str,
        context: Optional[any] = None,
        conversation_history: Optional[list] = None
    ) -> str:
        """
        General chat assistant for doctor registration help.
        """
        default_prompt = """You are a helpful assistant for NovareHealth, a telemedicine platform in Africa. 
You're helping doctors complete their registration and profile setup.

Be helpful, concise, and encouraging. Answer questions about:
- Registration process
- Profile optimization tips
- Telemedicine best practices
- Platform features

Keep responses brief (2-3 sentences max) unless more detail is requested."""

        # Handle context - can be string (system prompt) or dict (registration context)
        if context is None:
            system_prompt = default_prompt
        elif isinstance(context, str):
            system_prompt = context
        elif isinstance(context, dict):
            # Context from doctor registration page
            system_prompt = default_prompt + f"\n\nCurrent context: Step {context.get('step', 1)}, Specialization: {context.get('specialization', 'Not selected')}, Experience: {context.get('experience_years', 0)} years"
        else:
            system_prompt = default_prompt

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history for context
        if conversation_history:
            for msg in conversation_history[-10:]:  # Limit to last 10 messages
                if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                    messages.append({
                        "role": msg['role'],
                        "content": msg['content']
                    })
        
        # Add the current message
        messages.append({"role": "user", "content": message})
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()


# Singleton instance
ai_service = AIService()
