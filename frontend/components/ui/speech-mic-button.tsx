import React, { useState, useEffect, useRef } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

interface SpeechMicButtonProps {
  onTranscriptionComplete: (text: string) => void;
  language?: string;
}

export const SpeechMicButton: React.FC<SpeechMicButtonProps> = ({ 
  onTranscriptionComplete, 
  language = 'en-US' 
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  // Using a ref to track the accumulation of text dynamically
  const fullTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false; // Set to false so it only captures finalized sentences
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let resultText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          resultText += event.results[i][0].transcript + ' ';
        }
      }
      fullTranscriptRef.current += resultText;
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalResult = fullTranscriptRef.current.trim();
      if (finalResult) {
        onTranscriptionComplete(finalResult);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [language, onTranscriptionComplete]);

  const toggleListening = () => {
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      fullTranscriptRef.current = ''; // Reset transcript for a new recording session
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={isListening ? 'Stop listening' : 'Start voice input'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="32"
        height="32"
        fill={isListening ? '#ef4444' : '#6b7280'}
        style={{
          transition: 'fill 0.2s ease',
          transform: isListening ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
      </svg>
    </button>
  );
};