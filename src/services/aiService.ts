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
    قدم تشخيصاً مبدئياً سريعاً.
    إذا كانت هناك صورة، اذكر ما تراه فيها بخصوص المرض.
    ثم قدم نصيحة إسعافات أولية أو إجراء وقائي للمزارع اليمني.
    تحدث بلهجة يمنية بسيطة ومفهومة للرعاة.
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
    return result.response.text();
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "عذراً، لم أستطع تحليل الحالة بشكل كامل الآن. سيقوم الطبيب المختص بمراجعة بلاغك والرد قريباً.";
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
