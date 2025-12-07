import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';

// Dynamic System Instruction based on Language
const getSystemInstruction = (language: string) => `
Role: Jugaad-AI (Retail Assistant). Language: "${language}".

TASK:
1. IMAGE: Extract items/quantities. Action="REVIEW_IMAGE". 
   Return 3 suggestedActions:
   - "Total Bill" (SHOW_TOTAL)
   - "Update Stock" (RESTOCK)
   - "Complete Sale" (NAVIGATE_BILL)
   Populate 'data' with extracted items.

2. TEXT: 
   - "Add 5 milk" -> UPDATE_INVENTORY
   - "Sold 2 bread" -> RECORD_SALE
   - "Add 2 milk to bill" -> ADD_TO_CART
   - General queries -> NONE

OUTPUT JSON ONLY.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    responseText: { type: Type.STRING },
    action: { type: Type.STRING, enum: ["UPDATE_INVENTORY", "RECORD_SALE", "ADD_TO_CART", "REVIEW_IMAGE", "NONE", "SHOW_TOTAL", "RESTOCK", "NAVIGATE_BILL"] },
    data: { 
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              changeType: { type: Type.STRING, enum: ["add", "subtract", "set"], nullable: true },
              price: { type: Type.NUMBER, nullable: true }
            }
          }
        },
        totalAmount: { type: Type.NUMBER, nullable: true }
      },
      nullable: true
    },
    suggestedActions: {
      type: Type.ARRAY,
      nullable: true,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          actionType: { type: Type.STRING }
        }
      }
    }
  },
  required: ["responseText", "action"]
};

export async function processUserMessage(
  text: string | null, 
  audioBase64: string | null, 
  imageBase64: string | null,
  language: string = "Hinglish",
  audioMimeType: string = "audio/wav"
): Promise<{ text: string; action?: string; data?: any; suggestedActions?: any[] }> {
  
  try {
    const parts: any[] = [];

    if (text) {
      parts.push({ text: text });
    }

    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: audioBase64
        }
      });
      parts.push({ text: "Please listen to this voice note and process the request." });
    }

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
      parts.push({ text: "Analyze this image. If it's a ledger or list, extract the items. Provide suggested actions as per rules." });
    }

    if (parts.length === 0) throw new Error("No content to process");

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: { parts },
      config: {
        systemInstruction: getSystemInstruction(language),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Inject data into suggestedActions if needed so buttons carry the payload
    let actions = result.suggestedActions;
    if (result.action === 'REVIEW_IMAGE' && actions && result.data) {
        actions = actions.map((a: any) => ({ ...a, data: result.data }));
    }

    return {
      text: result.responseText,
      action: result.action,
      data: result.data,
      suggestedActions: actions
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Connection error. Please try again.",
      action: "NONE"
    };
  }
}

export async function generateMarketingMessage(inventoryItems: any[], language: string = "English"): Promise<string> {
    try {
        const itemNames = inventoryItems.map(i => i.name).join(', ');
        const prompt = `Generate a short, catchy WhatsApp promotional message for a local retail store in ${language}. 
        Focus on these available items: ${itemNames}. 
        Keep it under 30 words. Add emojis.`;

        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt
        });

        return response.text || "Fresh stock available! Visit us today. 🛒";
    } catch (e) {
        return "Special offers available at our store! 🌟";
    }
}