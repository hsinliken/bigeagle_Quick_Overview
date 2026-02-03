
import { GoogleGenAI, Type } from "@google/genai";
import { TourType, TourPlan } from "../types";
import { DOMESTIC_SYSTEM_PROMPT, INTERNATIONAL_SYSTEM_PROMPT } from "../constants";

const tourPlanSchema = {
  type: Type.OBJECT,
  properties: {
    mainTitle: { type: Type.STRING },
    marketingSubtitle: { type: Type.STRING },
    departureInfo: { type: Type.STRING },
    highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                activity: { type: Type.STRING }
              },
              required: ["time", "activity"]
            }
          },
          meals: {
            type: Type.OBJECT,
            properties: {
              breakfast: { type: Type.STRING },
              lunch: { type: Type.STRING },
              dinner: { type: Type.STRING }
            },
            required: ["breakfast", "lunch", "dinner"]
          },
          accommodation: { type: Type.STRING },
          imageUrl: { type: Type.STRING, description: "Keyword for image search" },
          imagePosition: { type: Type.STRING, enum: ["left", "right", "bottom"], description: "Default to 'right'" },
          imageCount: { type: Type.NUMBER, description: "Number of images (1-3)" }
        },
        required: ["day", "title", "description", "timeline", "meals", "accommodation", "imageUrl"]
      }
    },
    costIncludes: { type: Type.ARRAY, items: { type: Type.STRING } },
    costExcludes: { type: Type.ARRAY, items: { type: Type.STRING } },
    precautions: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedItems: { type: Type.ARRAY, items: { type: Type.STRING } },
    countryCity: { type: Type.STRING },
    flightInfo: {
      type: Type.OBJECT,
      properties: {
        departure: { type: Type.STRING },
        return: { type: Type.STRING }
      }
    }
  },
  required: ["mainTitle", "marketingSubtitle", "departureInfo", "highlights", "days", "costIncludes", "costExcludes", "precautions", "suggestedItems"]
};

export async function generateTourPlan(
  type: TourType,
  productName: string,
  extraContent?: string
): Promise<TourPlan> {
  // 遵循規範：每次調用時重新獲取金鑰，避免 Top-level 載入時的 race condition
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = type === TourType.DOMESTIC ? DOMESTIC_SYSTEM_PROMPT : INTERNATIONAL_SYSTEM_PROMPT;
  
  const prompt = `
    商品名稱: ${productName}
    類型: ${type === TourType.DOMESTIC ? '國內團體旅遊' : '國外團體旅遊'}
    ${extraContent ? `參考資料: ${extraContent}` : '請根據商品名稱自動生成完整行程內容。'}
    
    請確保生成的行程細節專業且誘人。對於 imagePosition，請預設為 'right'。對於 imageCount，請預設為 1。
  `;

  // 使用 gemini-3-flash-preview 以確保更快的響應速度與更高的環境相容性
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: tourPlanSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("AI 無法生成行程內容，請檢查 API Key 是否有效。");
  
  const data = JSON.parse(text);
  
  // 確保 AI 如果遺漏欄位，我們有預設值
  data.days = data.days.map((d: any) => ({
    ...d,
    imagePosition: d.imagePosition || 'right',
    imageCount: d.imageCount || 1
  }));
  
  return data as TourPlan;
}
