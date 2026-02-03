
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
          imageUrl: { type: Type.STRING },
          imagePosition: { type: Type.STRING, enum: ["left", "right", "bottom"] },
          imageCount: { type: Type.NUMBER }
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
  // 直接使用環境變數初始化 SDK
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const systemInstruction = type === TourType.DOMESTIC ? DOMESTIC_SYSTEM_PROMPT : INTERNATIONAL_SYSTEM_PROMPT;
  
  const prompt = `
    請根據以下資訊產出行程：
    商品名稱: ${productName}
    類型: ${type === TourType.DOMESTIC ? '國內團體旅遊' : '國外團體旅遊'}
    ${extraContent ? `參考資料或額外要求: ${extraContent}` : ''}
    
    請確保內容符合專業旅遊企劃書水準，語氣專業且吸引人。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: tourPlanSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 未能產生內容");
    
    const result = JSON.parse(text);
    result.days = result.days.map((d: any) => ({
      ...d,
      imagePosition: d.imagePosition || 'right',
      imageCount: d.imageCount || 1
    }));
    
    return result as TourPlan;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 統一錯誤訊息處理
    if (error.message?.includes("API Key") || error.message?.includes("401")) {
      throw new Error("API 金鑰驗證失敗。請檢查 Vercel 設定中的 API_KEY 是否正確。");
    }
    throw new Error(error.message || "生成的過程中發生未知錯誤");
  }
}
