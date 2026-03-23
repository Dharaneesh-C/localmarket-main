/**
 * useVoiceSearch — Web Speech API hook
 * Works in Chrome, Edge, Samsung Internet (most Indian Android phones)
 * Supports Tamil (ta-IN) and English (en-IN)
 */
import { useState, useRef, useCallback } from 'react';

export function useVoiceSearch({ onResult, language = 'ta-IN' }) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    if (!supported) {
      setError('Voice search not supported in this browser.');
      return;
    }
    setError('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language;           // 'ta-IN' for Tamil, 'en-IN' for English
    recognition.interimResults = false;    // only final result
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'no-speech') setError('No speech detected. Try again.');
      else if (event.error === 'not-allowed') setError('Microphone permission denied.');
      else setError('Voice search failed. Try again.');
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, language, onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, error, startListening, stopListening };
}
