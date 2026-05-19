// src/lib/utils/speech.ts

/**
 * Reads the provided text aloud using the Web Speech API.
 * @param text - The text to speak.
 * @param onStart - Optional callback when speech starts.
 * @param onEnd - Optional callback when speech ends.
 * @param onError - Optional callback if an error occurs.
 * @returns A function to stop the speech.
 */
export function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: Error) => void,
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.error("Speech synthesis is not supported in this browser.");
    onError?.(new Error("Speech synthesis is not supported."));
    return () => {};
  }

  const synthesis = window.speechSynthesis;
  synthesis.cancel(); // Stop any ongoing speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (event) => {
    console.error("Speech synthesis error:", event);
    onError?.(new Error("Speech synthesis failed."));
  };

  synthesis.speak(utterance);
  return () => synthesis.cancel();
}