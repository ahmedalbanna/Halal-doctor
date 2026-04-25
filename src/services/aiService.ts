import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function analyzeSymptoms(animalType: string, symptoms: string[], description?: string) {
  if (!genAI) throw new Error("Gemini API key is not configured.");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    أنت خبير بيطري رقمي. قام مزارع يمني بوصف حالة لحيوانه (${animalType}).
    الأعراض المختارة: ${symptoms.join(', ')}.
    الوصف الصوتي/النصي: ${description || 'لا يوجد وصف إضافي'}.
    
    بناءً على هذه المعلومات، قدم نصيحة أولية سريعة باللهجة اليمنية المفهومة (لهجة صنعانية أو حضرمية بسيطة).
    ركز على الإسعافات الأولية لحين رد الطبيب المختص.
    اجعل الرد مشجعاً وودوداً.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "عذراً، لم أستطع تحليل الحالة الآن. الطبيب سيرد عليك قريباً.";
  }
}
