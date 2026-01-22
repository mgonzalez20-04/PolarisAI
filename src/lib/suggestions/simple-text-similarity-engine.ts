import { SuggestionEngine, SuggestionResult, Suggestion } from "./types";
import { prisma } from "@/lib/prisma";

export class SimpleTextSimilarityEngine implements SuggestionEngine {
  name = "Simple Text Similarity";

  async generateSuggestions(
    emailSubject: string,
    emailBody: string,
    userId: string
  ): Promise<SuggestionResult> {
    // Fetch all resolved cases for this user
    const resolvedCases = await prisma.case.findMany({
      where: {
        userId,
        status: "resolved",
      },
      include: {
        email: true,
      },
      orderBy: {
        resolvedAt: "desc",
      },
      take: 50, // Limit to recent cases for performance
    });

    if (resolvedCases.length === 0) {
      const detectedLang = this.detectLanguage(`${emailSubject} ${emailBody}`.toLowerCase());
      return {
        suggestions: [
          {
            title: "Sin datos históricos",
            description: "Comienza a resolver casos para obtener sugerencias basadas en IA en el futuro.",
            confidence: 0,
          },
        ],
        suggestedResponse: this.getGenericResponse(detectedLang),
      };
    }

    // Calculate similarity scores using simple keyword matching
    const emailText = `${emailSubject} ${emailBody}`.toLowerCase();
    const scoredCases = resolvedCases
      .map((case_) => {
        const caseText =
          `${case_.email.subject} ${case_.email.bodyText || case_.email.bodyPreview || ""} ${case_.description || ""}`.toLowerCase();
        const similarity = this.calculateTextSimilarity(emailText, caseText);

        return {
          case: case_,
          similarity,
        };
      })
      .filter((item) => item.similarity > 0.1) // Filter out very low similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 similar cases

    // Generate suggestions from top similar cases
    const suggestions: Suggestion[] = scoredCases.map((item) => {
      const case_ = item.case;
      const tags = case_.tags ? JSON.parse(case_.tags) : [];
      const tagsStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";

      return {
        title: case_.title,
        description: `Caso similar resuelto el ${case_.resolvedAt?.toLocaleDateString()}${tagsStr}: ${case_.resolution?.substring(0, 100)}...`,
        relatedCaseId: case_.id,
        confidence: item.similarity,
      };
    });

    // If no similar cases found, provide generic suggestion
    if (suggestions.length === 0) {
      const detectedLang = this.detectLanguage(emailText);
      const suggestedResponse = this.getGenericResponse(detectedLang);

      return {
        suggestions: [
          {
            title: "Nuevo tipo de incidencia",
            description:
              "Esto parece ser un nuevo tipo de incidencia. Revisa el correo cuidadosamente y crea un nuevo caso.",
            confidence: 0,
          },
        ],
        suggestedResponse,
      };
    }

    // Generate suggested response based on top similar cases
    const topCases = scoredCases.slice(0, 3);
    const suggestedResponse = this.generateResponse(topCases, emailSubject, emailText);

    return {
      suggestions,
      suggestedResponse,
    };
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple keyword-based similarity using Jaccard similarity
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  private tokenize(text: string): string[] {
    // Remove common stop words and tokenize
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "is",
      "was",
      "are",
      "been",
      "be",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "my",
      "your",
      "his",
      "her",
      "its",
      "our",
      "their",
      "this",
      "that",
      "these",
      "those",
      // Spanish stop words
      "el",
      "la",
      "de",
      "que",
      "y",
      "en",
      "un",
      "ser",
      "se",
      "no",
      "haber",
      "por",
      "con",
      "su",
      "para",
      "como",
      "estar",
      "tener",
      "le",
      "lo",
      "todo",
      "pero",
      "más",
      "hacer",
      "o",
      "poder",
      "decir",
      "este",
      "ir",
      "otro",
      "ese",
      "la",
      "si",
      "me",
      "ya",
      "ver",
      "porque",
      "dar",
      "cuando",
      "él",
      "muy",
      "sin",
      "vez",
      "mucho",
      "saber",
      "qué",
      "sobre",
      "mi",
      "alguno",
      "mismo",
      "yo",
      "también",
      "hasta",
      "año",
      "dos",
      "querer",
      "entre",
      "así",
      "primero",
      "desde",
      "grande",
      "eso",
      "ni",
      "nos",
      "llegar",
      "pasar",
      "tiempo",
      "ella",
      "sí",
      "día",
      "uno",
      "bien",
      "poco",
      "deber",
      "entonces",
      "poner",
      "cosa",
      "tanto",
      "hombre",
      "parecer",
      "nuestro",
      "tan",
      "donde",
      "ahora",
      "parte",
      "después",
      "vida",
      "quedar",
      "siempre",
      "creer",
      "hablar",
      "llevar",
      "dejar",
      "nada",
      "cada",
      "seguir",
      "menos",
      "nuevo",
      "encontrar",
      "algo",
      "solo",
      "pues",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
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

  private generateResponse(
    scoredCases: Array<{ case: any; similarity: number }>,
    emailSubject: string,
    emailText: string
  ): { text: string; basedOnCaseIds: string[]; textEs?: string; detectedLanguage: string } {
    const detectedLang = this.detectLanguage(emailText);

    if (scoredCases.length === 0) {
      return this.getGenericResponse(detectedLang);
    }

    // Use the response from the most similar case as a template
    const topCase = scoredCases[0].case;
    const baseResponse = topCase.response || "";
    const caseIds = scoredCases.map((item) => item.case.id);

    // If we have a good response from a similar case, use it as a starting point
    if (baseResponse && scoredCases[0].similarity > 0.3) {
      // The base response is in Spanish (from our DB), generate translation if needed
      if (detectedLang === "es") {
        return {
          text: baseResponse,
          basedOnCaseIds: caseIds,
          detectedLanguage: detectedLang,
        };
      } else {
        // Generate translated version for the detected language
        const translatedText = this.translateResponse(baseResponse, detectedLang, emailSubject);
        return {
          text: translatedText,
          basedOnCaseIds: caseIds,
          textEs: baseResponse,
          detectedLanguage: detectedLang,
        };
      }
    }

    // Otherwise, generate a response based on resolution
    const resolution = topCase.resolution || "resolver su problema";
    const basedOnCaseIds = caseIds;

    if (detectedLang === "es") {
      return {
        text: `Gracias por contactarnos respecto a "${emailSubject}".\n\nBasándonos en casos similares, recomendamos el siguiente enfoque: ${resolution}\n\nPor favor, háganos saber si necesita asistencia adicional.\n\nSaludos cordiales,\nEquipo de Soporte BMW`,
        basedOnCaseIds,
        detectedLanguage: detectedLang,
      };
    } else if (detectedLang === "en") {
      const textEs = `Gracias por contactarnos respecto a "${emailSubject}".\n\nBasándonos en casos similares, recomendamos el siguiente enfoque: ${resolution}\n\nPor favor, háganos saber si necesita asistencia adicional.\n\nSaludos cordiales,\nEquipo de Soporte BMW`;
      return {
        text: `Thank you for contacting us regarding "${emailSubject}".\n\nBased on similar cases, we recommend the following approach: ${resolution}\n\nPlease let us know if you need any additional assistance.\n\nBest regards,\nBMW Support Team`,
        basedOnCaseIds,
        textEs,
        detectedLanguage: detectedLang,
      };
    } else if (detectedLang === "de") {
      const textEs = `Gracias por contactarnos respecto a "${emailSubject}".\n\nBasándonos en casos similares, recomendamos el siguiente enfoque: ${resolution}\n\nPor favor, háganos saber si necesita asistencia adicional.\n\nSaludos cordiales,\nEquipo de Soporte BMW`;
      return {
        text: `Vielen Dank für Ihre Kontaktaufnahme bezüglich "${emailSubject}".\n\nBasierend auf ähnlichen Fällen empfehlen wir folgendes Vorgehen: ${resolution}\n\nBitte lassen Sie uns wissen, wenn Sie weitere Unterstützung benötigen.\n\nMit freundlichen Grüßen,\nBMW Support Team`,
        basedOnCaseIds,
        textEs,
        detectedLanguage: detectedLang,
      };
    }

    // Fallback to Spanish
    return {
      text: `Gracias por contactarnos respecto a "${emailSubject}".\n\nBasándonos en casos similares, recomendamos el siguiente enfoque: ${resolution}\n\nPor favor, háganos saber si necesita asistencia adicional.\n\nSaludos cordiales,\nEquipo de Soporte BMW`,
      basedOnCaseIds,
      detectedLanguage: "es",
    };
  }

  private translateResponse(spanishText: string, targetLang: string, subject: string): string {
    // Simple translation templates for common response patterns
    if (targetLang === "en") {
      return spanishText
        .replace(/Gracias por contactarnos/gi, "Thank you for contacting us")
        .replace(/Saludos cordiales/gi, "Best regards")
        .replace(/Equipo de Soporte/gi, "Support Team")
        .replace(/Por favor/gi, "Please")
        .replace(/háganos saber/gi, "let us know")
        .replace(/asistencia adicional/gi, "additional assistance")
        .replace(/recomendamos/gi, "we recommend");
    } else if (targetLang === "de") {
      return spanishText
        .replace(/Gracias por contactarnos/gi, "Vielen Dank für Ihre Kontaktaufnahme")
        .replace(/Saludos cordiales/gi, "Mit freundlichen Grüßen")
        .replace(/Equipo de Soporte/gi, "Support Team")
        .replace(/Por favor/gi, "Bitte")
        .replace(/háganos saber/gi, "lassen Sie uns wissen")
        .replace(/asistencia adicional/gi, "weitere Unterstützung")
        .replace(/recomendamos/gi, "empfehlen wir");
    }
    return spanishText;
  }
}
