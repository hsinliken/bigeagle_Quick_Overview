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
  // 直接初始化，SDK 會在內部處理金鑰
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const systemInstruction = type === TourType.DOMESTIC ? DOMESTIC_SYSTEM_PROMPT : INTERNATIONAL_SYSTEM_PROMPT;
  
  const prompt = `
    請根據以下資訊產出行程：
    商品名稱: ${productName}
    類型: ${type === TourType.DOMESTIC ? '國內團體旅遊' : '國外團體旅遊'}
    ${extraContent ? `參考資料或額外要求: ${extraContent}` : ''}
    
    請確保內容符合專業旅遊企劃書水準。
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
    if (!text) throw new Error("AI 未能產生內容，請換個名稱試試看。");
    
    const result = JSON.parse(text);
    // 確保圖片位置與數量有預設值
    result.days = result.days.map((d: any) => ({
      ...d,
      imagePosition: d.imagePosition || 'right',
      imageCount: d.imageCount || 1
    }));
    
    return result as TourPlan;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 重新封裝錯誤訊息
    if (error.message?.includes("API Key") || error.message?.includes("key not found")) {
      throw new Error("金鑰無效或未被正確讀取。如果您在 Vercel 部署，請確認環境變數名稱為 API_KEY。");
    }
    throw error;
  }
}