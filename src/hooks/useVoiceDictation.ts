import { useEffect, useRef, useState } from 'react';

interface UseVoiceDictationOptions {
  lang?: string;
  onTranscript: (transcript: string) => void;
}

export function useVoiceDictation({ lang = 'pt-BR', onTranscript }: UseVoiceDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup error
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    setVoiceError(null);

    if (!isSupported) {
      setVoiceError('Seu navegador não suporta ditado por voz. Tente no Chrome ou Edge.');
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setVoiceError('Permissão do microfone negada no navegador.');
      } else if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
        setVoiceError(`Erro no microfone: ${event?.error || 'indisponível'}`);
      }
      setTimeout(() => setVoiceError(null), 4000);
    };
    recognition.onresult = (event: any) => {
      const results = event?.results;
      if (!results) return;
      const chunks: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const transcript = results[i]?.[0]?.transcript;
        if (transcript) chunks.push(transcript.trim());
      }
      const joined = chunks.join(' ').trim();
      if (joined) {
        onTranscriptRef.current(joined);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError('Não foi possível iniciar o microfone.');
      setTimeout(() => setVoiceError(null), 4000);
    }
  };

  return {
    isListening,
    isSupported,
    voiceError,
    toggleVoiceInput,
  };
}
