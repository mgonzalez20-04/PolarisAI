import { SuggestionEngine, SuggestionResult, Suggestion } from "./types";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export class EmbeddingEngine implements SuggestionEngine {
  name = "Embedding-based Similarity";
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateSuggestions(
    emailSubject: string,
    emailBody: string,
    userId: string
  ): Promise<SuggestionResult> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    // Generate embedding for the incoming email
    const emailText = `${emailSubject}\n\n${emailBody}`;
    const emailEmbedding = await this.generateEmbedding(emailText);

    // Fetch all resolved cases with embeddings
    const resolvedCases = await prisma.case.findMany({
      where: {
        userId,
        status: "resolved",
        embedding: { not: null },
      },
      include: {
        email: true,
      },
      orderBy: {
        resolvedAt: "desc",
      },
    });

    if (resolvedCases.length === 0) {
      const detectedLang = this.detectLanguage(emailText);
      return {
        suggestions: [
          {
            title: "Sin datos históricos",
            description: "Comienza a resolver casos para obtener sugerencias basadas en IA.",
            confidence: 0,
          },
        ],
        suggestedResponse: this.getGenericResponse(detectedLang),
      };
    }

    // Calculate cosine similarity with each case
    const scoredCases = resolvedCases
      .map((case_) => {
        if (!case_.embedding) return null;

        const caseEmbedding = JSON.parse(case_.embedding);
        const similarity = this.cosineSimilarity(emailEmbedding, caseEmbedding);

        return {
          case: case_,
          similarity,
        };
      })
      .filter((item): item is { case: any; similarity: number } => item !== null)
      .filter((item) => item.similarity > 0.7) // Only high similarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    // Generate suggestions
    const suggestions: Suggestion[] = scoredCases.map((item) => {
      const case_ = item.case;
      const tags = case_.tags ? JSON.parse(case_.tags) : [];
      const tagsStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";

      return {
        title: case_.title,
        description: `Caso muy similar resuelto el ${case_.resolvedAt?.toLocaleDateString()}${tagsStr}: ${case_.resolution?.substring(0, 100)}...`,
        relatedCaseId: case_.id,
        confidence: item.similarity,
      };
    });

    if (suggestions.length === 0) {
      const detectedLang = this.detectLanguage(emailText);
      return {
        suggestions: [
          {
            title: "Nuevo tipo de incidencia",
            description: "Esto parece ser un nuevo tipo de incidencia.",
            confidence: 0,
          },
        ],
        suggestedResponse: this.getGenericResponse(detectedLang),
      };
    }

    // Detect language
    const detectedLang = this.detectLanguage(emailText);

    // Generate suggested response using GPT
    const topCase = scoredCases[0].case;
    const suggestedResponse = await this.generateAIResponse(
      emailSubject,
      emailBody,
      topCase,
      detectedLang
    );

    return {
      suggestions,
      suggestedResponse,
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) throw new Error("OpenAI not initialized");

    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private async generateAIResponse(
    emailSubject: string,
    emailBody: string,
    similarCase: any,
    detectedLang: string
  ): Promise<{ text: string; basedOnCaseIds: string[]; textEs?: string; detectedLanguage: string }> {
    if (!this.openai) throw new Error("OpenAI not initialized");

    const languageMap: Record<string, string> = {
      es: "Spanish",
      en: "English",
      de: "German",
    };

    const targetLang = languageMap[detectedLang] || "Spanish";

    const prompt = `You are a customer support agent for BMW. Based on a similar case that was resolved, draft a response to the following email.

Incoming Email:
Subject: ${emailSubject}
Body: ${emailBody}

Similar Resolved Case:
Title: ${similarCase.title}
Resolution: ${similarCase.resolution}
Previous Response: ${similarCase.response || "N/A"}

IMPORTANT: Draft a professional, helpful response in ${targetLang} language. ${detectedLang !== "es" ? "Also provide a Spanish translation." : ""}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful BMW customer support agent. Draft professional, empathetic responses in ${targetLang}.${detectedLang !== "es" ? " If asked, also provide translations in Spanish." : ""}`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const aiResponse = response.choices[0].message.content || "Gracias por su correo.";

    // If not Spanish, generate Spanish translation
    if (detectedLang !== "es") {
      const translationPrompt = `Translate the following customer support response to Spanish:

${aiResponse}

Provide ONLY the Spanish translation, nothing else:`;

      const translationResponse = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional translator. Translate customer support messages to Spanish.",
          },
          { role: "user", content: translationPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const spanishTranslation = translationResponse.choices[0].message.content || "";

      return {
        text: aiResponse,
        basedOnCaseIds: [similarCase.id],
        textEs: spanishTranslation,
        detectedLanguage: detectedLang,
      };
    }

    return {
      text: aiResponse,
      basedOnCaseIds: [similarCase.id],
      detectedLanguage: detectedLang,
    };
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const lowerText = text.toLowerCase();

    // Spanish indicators
    const spanishWords = ["hola", "gracias", "por favor", "buenos días", "mi", "su", "problema", "ayuda", "necesito", "tengo", "está", "estoy", "bmw", "coche", "vehículo"];
    const spanishCount = spanishWords.filter(word => lowerText.includes(word)).length;

    // English indicators
    const englishWords = ["hello", "thank", "please", "good morning", "my", "your", "problem", "help", "need", "have", "is", "am", "car", "vehicle"];
    const englishCount = englishWords.filter(word => lowerText.includes(word)).length;

    // German indicators
    const germanWords = ["hallo", "danke", "bitte", "guten tag", "mein", "ihr", "problem", "hilfe", "brauche", "habe", "ist", "bin", "auto", "fahrzeug"];
    const germanCount = germanWords.filter(word => lowerText.includes(word)).length;

    if (spanishCount > englishCount && spanishCount > germanCount) {
      return "es";
    } else if (englishCount > spanishCount && englishCount > germanCount) {
      return "en";
    } else if (germanCount > spanishCount && germanCount > englishCount) {
      return "de";
    }

    // Default to Spanish
    return "es";
  }

  private getGenericResponse(language: string): { text: string; basedOnCaseIds: string[]; textEs?: string; detectedLanguage: string } {
    const responses: Record<string, string> = {
      es: "Gracias por contactarnos. Estamos revisando su solicitud y le responderemos en breve.",
      en: "Thank you for reaching out. We're looking into your request and will get back to you shortly.",
      de: "Vielen Dank für Ihre Kontaktaufnahme. Wir prüfen Ihre Anfrage und werden uns in Kürze bei Ihnen melden.",
    };

    const text = responses[language] || responses.es;
    const textEs = language !== "es" ? responses.es : undefined;

    return {
      text,
      basedOnCaseIds: [],
      textEs,
      detectedLanguage: language,
    };
  }

  async generateAndStoreEmbedding(caseId: string): Promise<void> {
    if (!this.openai) return;

    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: { email: true },
    });

    if (!case_) return;

    const text = `${case_.email.subject}\n\n${case_.email.bodyText || case_.email.bodyPreview || ""}\n\nResolution: ${case_.resolution || ""}`;
    const embedding = await this.generateEmbedding(text);

    await prisma.case.update({
      where: { id: caseId },
      data: { embedding: JSON.stringify(embedding) },
    });
  }
}
