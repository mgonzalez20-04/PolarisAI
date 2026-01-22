export interface Suggestion {
  title: string;
  description: string;
  relatedCaseId?: string;
  confidence: number; // 0-1
}

export interface SuggestedResponse {
  text: string;
  basedOnCaseIds: string[];
  textEs?: string; // Traducción al español (si el idioma original no es español)
  detectedLanguage?: string; // Idioma detectado del correo
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  suggestedResponse: SuggestedResponse;
}

export interface SuggestionEngine {
  name: string;
  generateSuggestions(
    emailSubject: string,
    emailBody: string,
    userId: string
  ): Promise<SuggestionResult>;
}
