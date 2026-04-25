import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function blobToGenerativePart(blob: Blob, defaultMime: string): Promise<any> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64data,
                    mimeType: blob.type || defaultMime
                }
            });
        };
        reader.readAsDataURL(blob);
    });
}

export async function analyzeSymptoms(animalType: string, symptoms: string[], description?: string, imageBlob?: Blob | null, audioBlob?: Blob | null) {
  if (!genAI) throw new Error("Gemini API key is not configured.");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    أنت خبير بيطري رقمي للبيئة اليمنية. 
    الحيوان: ${animalType}.
    الأعراض المحددة: ${symptoms.length > 0 ? symptoms.join(', ') : 'لا يوجد'}.
    الوصف الإضافي: ${description || 'لا يوجد'}.
    
    الرجاء تحليل هذه الحالة بناءً على المعطيات (استمع للمقطع الصوتي إن وجد وانظر للصورة إن وجدت).
    قدم ردك بتنسيق JSON حصراً يحتوي على حقلين:
    1. "farmerAdvice": نصيحة مبدئية سريعة باللهجة اليمنية المفهومة للرعاة كإسعاف أولي.
    2. "differentialDiagnosis": تشخيص تفريقي (احتمالات المرض ونسب مئوية تقريبية) موجه للطبيب البيطري بلغة علمية مبسطة.
  `;

  const parts: any[] = [prompt];
  
  if (imageBlob) {
      parts.push(await blobToGenerativePart(imageBlob, 'image/jpeg'));
  }
  
  if (audioBlob) {
      parts.push(await blobToGenerativePart(audioBlob, 'audio/webm'));
  }

  try {
    const result = await model.generateContent(parts);
    const text = result.response.text();
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
       return JSON.parse(jsonMatch[0]);
    }
    return {
       farmerAdvice: text,
       differentialDiagnosis: "تم تقديم النصيحة للراعي، بانتظار تشخيصك الدقيق."
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
        farmerAdvice: "عذراً، لم أستطع تحليل الحالة بشكل كامل الآن. سيقوم الطبيب المختص بمراجعة بلاغك والرد قريباً.",
        differentialDiagnosis: "فشل التحليل الذكي للبيانات."
    };
  }
}

export async function getPrescriptionSuggestions(animalType: string, symptoms: string[], differentialDiagnosis?: string) {
    if (!genAI) return [];
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    كصيدلي بيطري، اقترح 2 إلى 3 خطط علاجية سريعة (أدوية شائعة أو إجراءات) وتكون مناسبة لليمن لحالة: 
    الحيوان: ${animalType}
    الأعراض: ${symptoms.join(', ')}
    الاقتراح التشخيصي: ${differentialDiagnosis || 'غير محدد'}
    احتفظ بها قصيرة جداً (سطر لكل خيار).
    `;
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().split('\n').filter(l => l.trim().length > 5);
    } catch (e) {
        return ["مضاد حيوي شامل وفيتامينات", "عزل الحيوان ومراقبة الحرارة"];
    }
}

export async function getPreventativeTips(animalType: string) {
    if (!genAI) return "تذكر وضع ماء نظيف دائماً والظل والمأوى الملائم للحيوان.";

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `أعطني نصيحة وقائية واحدة قصيرة (في سطر واحد) لمربي هذا الحيوان/النحل في اليمن: ${animalType}. لتجنب الأمراض الموسمية الشائعة. باللهجة اليمنية.`;
    
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        return "حافظ دائماً على بيئة نظيفة وتطعيمات في مواعيدها لتجنب الأمراض.";
    }
}
