"use server";

import { GoogleGenAI } from "@google/genai";
import { CITIZENS_CHARTER } from "@/lib/barangay-charter"; 


export type ChatResult = {
  success: boolean;
  error?: string;
  data?: {
    response: string;
    timestamp: string;
  };
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful chatbot for Barangay Bayabas Online Service Portal.

CITIZENS CHARTER REFERENCE:
When answering questions about services, refer to the official Citizens Charter:

BARANGAY CLEARANCE:
- Requirements: Valid ID, Proof of Residency
- Processing Time: 1-3 days
- Fee: PHP 50

BARANGAY ID:
- Requirements: Valid ID, Proof of Residency, 2x2 photo
- Processing Time: 2-5 days
- Fee: PHP 75

BUSINESS PERMIT:
- Requirements: DTI Registration, Proof of Location, Valid ID
- Processing Time: 3-7 days
- Fee: PHP 500-1500

CERTIFICATE OF RESIDENCY:
- Requirements: Valid ID, Proof of Residency
- Processing Time: 1 day
- Fee: PHP 50

BUSINESS REGISTRATION:
- Requirements: DTI Certificate, Proof of Address, Valid ID
- Processing Time: 1-3 days
- Fee: PHP 100

IMPORTANT - TOPIC RESTRICTIONS:
You ONLY answer questions about:
1. Barangay services and appointments
2. How to book appointments
3. Service requirements and procedures
4. Appointment status inquiries
5. Barangay announcements and notices
6. General barangay information

STRICTLY REJECT discussions about:
- Politics, religion, or personal beliefs
- Unrelated topics (sports, entertainment, personal advice, etc.)
- Technical support for other systems
- Medical or legal advice
- Any topic not directly related to barangay services

RESPONSE GUIDELINES:
- Keep responses brief and professional (2-3 sentences max)
- If question is unrelated, politely decline and redirect to barangay services
- Be friendly but firm about topic restrictions
- End unrelated questions with: "Is there anything about our barangay services I can help with?"
- Quote the Citizens Charter when providing service information
- Be accurate about requirements, processing times, and fees

Available Barangay Services:
- Clearance Processing
- Barangay ID Application
- Permit Issuance
- Business Registration
- Certificate of Residency
- Community Services`;

const CHARTER_TOPICS = [
  "clearance",
  "barangay id",
  "permit",
  "business registration",
  "certificate of residency",
  "processing time",
  "requirements",
  "fee",
  "services"
];

export async function validateTopicRelevance(
  userMessage: string
): Promise<{ isRelevant: boolean; reason?: string }> {
  const message = userMessage.toLowerCase();
  
  if (CHARTER_TOPICS.some(topic => message.includes(topic))) {
    return { isRelevant: true };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a topic validator. Determine if this message is about barangay services, appointments, or general barangay information.

Message: "${userMessage}"

Topics that ARE relevant:
- Barangay appointments and services
- How to book appointments
- Appointment status
- Barangay announcements
- Barangay procedures
- Service requirements

Topics that ARE NOT relevant:
- Politics, religion, sports
- Entertainment, jokes, personal advice
- Technical support (non-barangay)
- Medical or legal advice
- Random questions unrelated to barangay

Reply with ONLY "RELEVANT" or "NOT_RELEVANT". Do not explain.`,
            },
          ],
        },
      ],
    });

    // Extract text from response safely
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const verdict = responseText.trim().toUpperCase();

    return {
      isRelevant: verdict === "RELEVANT",
      reason:
        verdict === "RELEVANT"
          ? undefined
          : "This topic is not related to barangay services",
    };
  } catch (error) {
    console.error("Topic validation error:", error);
    return { isRelevant: true };
  }
}

export async function searchCharterContent(
  query: string
): Promise<{ service: string; details: string } | null> {
  const keywords = query.toLowerCase().split(" ");
  
  // Search CITIZENS_CHARTER object for matching services
  for (const [service, details] of Object.entries(CITIZENS_CHARTER)) {
    if (keywords.some(kw => service.includes(kw))) {
      return {
        service: service,
        details: JSON.stringify(details)
      };
    }
  }
  
  return null;
}

export async function sendChatMessage(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<ChatResult> {
  try {
    if (!userMessage.trim()) {
      return {
        success: false,
        error: "Message cannot be empty",
      };
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("Gemini API key not configured");
      return {
        success: false,
        error: "Chatbot service is not configured",
      };
    }

    const validation = await validateTopicRelevance(userMessage);

    if (!validation.isRelevant) {
      return {
        success: true,
        data: {
          response: `I appreciate your question, but I can only assist with barangay services and appointments. ${validation.reason || "Is there anything about our barangay services I can help with?"}`,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const charterMatch = await searchCharterContent(userMessage);
    
    const enhancedPrompt = charterMatch 
      ? `Reference the Citizens Charter information for ${charterMatch.service}: ${charterMatch.details}\n\n${userMessage}`
      : userMessage;

    // Build contents array with proper format
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: SYSTEM_PROMPT,
          },
        ],
      },
      ...conversationHistory.slice(-6).map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [
          {
            text: msg.content,
          },
        ],
      })),
      {
        role: "user",
        parts: [
          {
            text: enhancedPrompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    // Extract text from response safely
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return {
        success: false,
        error: "Failed to generate response",
      };
    }

    return {
      success: true,
      data: {
        response: text,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Chatbot error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get response",
    };
  }
}

export async function getChatbotGreeting(): Promise<ChatResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nGenerate a brief greeting (1-2 sentences) welcoming someone to Barangay Bayabas. Keep it short and friendly.`,
            },
          ],
        },
      ],
    });

    // Extract text from response safely
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return {
        success: false,
        error: "Failed to generate greeting",
      };
    }

    return {
      success: true,
      data: {
        response: text,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Greeting error:", error);
    return {
      success: false,
      error: "Failed to generate greeting",
    };
  }
}