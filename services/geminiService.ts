
import { GoogleGenAI } from "@google/genai";

export const generateLessonDescription = async (title: string, instrument: string, level: string) => {
  // Inicializa apenas no momento da chamada para garantir que process.env.API_KEY esteja disponível
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma descrição curta e inspiradora para uma aula de música com o título "${title}" para o instrumento ${instrument} no nível ${level}. Foque em como isso ajuda a tocar hinos de forma solene.`,
    });
    return response.text || "Descrição não disponível.";
  } catch (error) {
    console.error("Erro ao gerar descrição com Gemini:", error);
    return "Erro ao gerar descrição automaticamente.";
  }
};

export const suggestExercises = async (level: string, instrument: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira 3 exercícios técnicos fundamentais para um aluno de ${instrument} que está no nível ${level} e deseja tocar hinos religiosos. Retorne apenas em tópicos.`,
    });
    return response.text || "Sugestões não disponíveis.";
  } catch (error) {
    console.error("Erro ao sugerir exercícios:", error);
    return "Erro ao obter sugestões.";
  }
};
