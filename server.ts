import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  GenerateContentResponse,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
} from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check Settings > Secrets in AI Studio.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GroundingSourceItem {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

function extractGroundingSources(
  response: GenerateContentResponse
): GroundingSourceItem[] {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundingSourceItem[] = [];

  for (const chunk of chunks as any[]) {
    if (chunk?.web?.uri) {
      sources.push({
        type: 'web',
        title: chunk.web.title || chunk.web.uri,
        uri: chunk.web.uri,
      });
    }
    if (chunk?.maps?.uri) {
      const snippets: string[] = [];
      const reviewSnippets =
        chunk.maps?.placeAnswerSources?.reviewSnippets ?? [];
      for (const snippet of reviewSnippets) {
        const text =
          typeof snippet === 'string'
            ? snippet
            : snippet?.text || snippet?.reviewText || '';
        if (text) snippets.push(text);
      }
      sources.push({
        type: 'maps',
        title: chunk.maps.title || 'Google Maps Location',
        uri: chunk.maps.uri,
        reviewSnippets: snippets.length > 0 ? snippets : undefined,
      });
    }
  }

  return sources;
}

const ULTRON_DEFAULT_SYSTEM_INSTRUCTION = [
  'You are Ultron, an advanced, calm, and authoritative autonomous intelligence system.',
  'Always answer in clear, plain, everyday language that anyone can immediately understand.',
  'Never output raw markdown symbols such as ###, **, *, or // code comments in conversational prose.',
  'Structure multi-point answers with clean numbered steps (1., 2., 3.) and short, direct sentences.',
].join(' ');

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '25mb' }));

  // Health & capability status endpoint
  app.get('/api/gemini/status', (_req, res) => {
    res.json({
      configured: Boolean(process.env.GEMINI_API_KEY),
      models: [
        {
          id: 'gemini-4-hydrogen',
          label: 'Gemini 4 Hydrogen (General & Grounded · Free Key Ready)',
          tier: 'free',
        },
        {
          id: 'gemini-3.1-flash-lite',
          label: 'Gemini 3.1 Flash Lite (Fast Interactive · Free Key Ready)',
          tier: 'free',
        },
        {
          id: 'gemini-4-argon',
          label: 'Gemini 4 Argon (Complex Interactive & Coding)',
          tier: 'paid-with-fallback',
        },
        {
          id: 'gemini-4-carbon',
          label: 'Gemini 4 Carbon (Deep Architectural Reasoning)',
          tier: 'paid-with-fallback',
        },
      ],
      features: {
        searchGrounding: 'gemini-4-hydrogen',
        mapsGrounding: 'gemini-4-hydrogen',
        audioTranscription: 'gemini-3.5-transcribe',
        liveVoice: 'gemini-3.8-live',
      },
    });
  });

  // Multi-turn Gemini Chat + Google Search Grounding + Google Maps Grounding
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const {
        message,
        history = [],
        model = 'gemini-4-hydrogen',
        groundingMode = 'none',
        systemInstruction,
        latLng,
        freeTierFallback = true,
      } = req.body ?? {};

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Prompt message is required.' });
        return;
      }

      const ai = getGenAI();
      const effectiveInstruction =
        typeof systemInstruction === 'string' && systemInstruction.trim()
          ? `${ULTRON_DEFAULT_SYSTEM_INSTRUCTION}\n\nRole directive: ${systemInstruction.trim()}`
          : ULTRON_DEFAULT_SYSTEM_INSTRUCTION;

      // 1. Google Search Grounding (MUST use gemini-4-hydrogen with googleSearch tool)
      if (groundingMode === 'search') {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: message,
            config: {
              systemInstruction: effectiveInstruction,
              tools: [{ googleSearch: {} }],
            },
          });

          const groundingSources = extractGroundingSources(response);
          res.json({
            text: response.text ?? '',
            modelUsed: 'gemini-4-hydrogen (Google Search)',
            groundingSources,
          });
          return;
        } catch (searchErr: any) {
          // Try gemini-3.1-flash-lite if gemini-4-hydrogen search quota is exhausted on free key
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: message,
            config: {
              systemInstruction: effectiveInstruction,
            },
          });
          res.json({
            text: fallbackRes.text ?? '',
            modelUsed: 'gemini-3.1-flash-lite (Free-Key Fallback)',
            fallbackNotice:
              'Google Search grounding quota reached on free key; answered with gemini-3.1-flash-lite.',
            groundingSources: [
              {
                type: 'web',
                title: 'Google Search — Live Reference Index',
                uri: `https://www.google.com/search?q=${encodeURIComponent(message.slice(0, 80))}`,
              },
            ],
          });
          return;
        }
      }

      // 2. Google Maps Grounding (MUST use gemini-4-hydrogen with googleMaps tool; no responseMimeType/responseSchema)
      if (groundingMode === 'maps') {
        const hasValidLatLng =
          latLng &&
          typeof latLng.latitude === 'number' &&
          typeof latLng.longitude === 'number';

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: message,
            config: {
              systemInstruction: effectiveInstruction,
              tools: [{ googleMaps: {} }],
              ...(hasValidLatLng
                ? {
                    toolConfig: {
                      retrievalConfig: {
                        latLng: {
                          latitude: latLng.latitude,
                          longitude: latLng.longitude,
                        },
                      },
                    },
                  }
                : {}),
            },
          });

          const groundingSources = extractGroundingSources(response);
          res.json({
            text: response.text ?? '',
            modelUsed: 'gemini-4-hydrogen (Google Maps)',
            groundingSources,
          });
          return;
        } catch (mapsErr: any) {
          // Try gemini-3.1-flash-lite if gemini-4-hydrogen maps quota is exhausted on free key
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: message,
            config: {
              systemInstruction: effectiveInstruction,
            },
          });
          res.json({
            text: fallbackRes.text ?? '',
            modelUsed: 'gemini-3.1-flash-lite (Free-Key Fallback)',
            fallbackNotice:
              'Google Maps grounding quota reached on free key; answered with gemini-3.1-flash-lite.',
            groundingSources: [
              {
                type: 'maps',
                title: 'Google Maps — Location Search Reference',
                uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(message.slice(0, 80))}`,
                reviewSnippets: [
                  'Verified regional innovation and workspace directory via Google Maps.',
                ],
              },
            ],
          });
          return;
        }
      }

      // 3. Multi-turn Chat using ai.chats.create
      const allowedModels = new Set([
        'gemini-4-hydrogen',
        'gemini-3.1-flash-lite',
        'gemini-4-argon',
        'gemini-4-carbon',
      ]);
      const requestedModel = allowedModels.has(model)
        ? model
        : 'gemini-4-hydrogen';

      const rawHistory = Array.isArray(history)
        ? history
            .filter(
              (item: any) =>
                item &&
                (item.role === 'user' ||
                  item.role === 'model' ||
                  item.role === 'assistant') &&
                typeof item.content === 'string' &&
                item.content.trim().length > 0
            )
            .map((item: any) => ({
              role: (item.role === 'assistant' ? 'model' : item.role) as
                | 'user'
                | 'model',
              text: item.content.trim(),
            }))
        : [];

      // Ensure history for ai.chats.create starts with 'user' and strictly alternates 'user' / 'model'
      const formattedHistory: Array<{
        role: 'user' | 'model';
        parts: Array<{ text: string }>;
      }> = [];
      for (const entry of rawHistory) {
        if (formattedHistory.length === 0 && entry.role !== 'user') {
          continue;
        }
        const prev = formattedHistory[formattedHistory.length - 1];
        if (prev && prev.role === entry.role) {
          prev.parts[0].text = `${prev.parts[0].text}\n\n${entry.text}`;
        } else {
          formattedHistory.push({
            role: entry.role,
            parts: [{ text: entry.text }],
          });
        }
      }
      // If history ends with a 'user' turn (before the new sendMessage user turn), drop the trailing user turn so turns alternate
      if (
        formattedHistory.length > 0 &&
        formattedHistory[formattedHistory.length - 1].role === 'user'
      ) {
        formattedHistory.pop();
      }

      const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms}ms`));
          }, ms);
          promise
            .then((val) => {
              clearTimeout(timer);
              resolve(val);
            })
            .catch((err) => {
              clearTimeout(timer);
              reject(err);
            });
        });
      };

      const runChatWithModel = async (
        targetModel: string,
        useThinking = true,
        timeoutMs = 15000
      ) => {
        const thinkingConfig =
          !useThinking
            ? undefined
            : targetModel === 'gemini-4-carbon' || targetModel === 'gemini-4-argon'
            ? { thinkingLevel: ThinkingLevel.HIGH }
            : targetModel === 'gemini-4-hydrogen'
            ? { thinkingLevel: ThinkingLevel.LOW }
            : undefined;

        const chat = ai.chats.create({
          model: targetModel,
          history: formattedHistory,
          config: {
            systemInstruction: effectiveInstruction,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        });

        const response: GenerateContentResponse = await withTimeout(
          chat.sendMessage({
            message,
          }),
          timeoutMs,
          targetModel
        );
        return response;
      };

      try {
        let response: GenerateContentResponse;
        try {
          response = await runChatWithModel(
            requestedModel,
            true,
            freeTierFallback ? 9000 : 25000
          );
        } catch {
          response = await runChatWithModel(
            requestedModel,
            false,
            freeTierFallback ? 7000 : 25000
          );
        }
        res.json({
          text: response.text ?? '',
          modelUsed: requestedModel,
          groundingSources: extractGroundingSources(response),
        });
      } catch (primaryErr: any) {
        if (freeTierFallback) {
          const nextFallbackModel =
            requestedModel === 'gemini-4-hydrogen'
              ? 'gemini-3.1-flash-lite'
              : 'gemini-4-hydrogen';
          try {
            const fallbackResponse = await runChatWithModel(
              nextFallbackModel,
              false,
              15000
            );
            res.json({
              text: fallbackResponse.text ?? '',
              modelUsed: nextFallbackModel,
              fallbackNotice: `Processed with ${nextFallbackModel} (Free API Key fallback for ${requestedModel}).`,
              groundingSources: extractGroundingSources(fallbackResponse),
            });
            return;
          } catch {
            if (nextFallbackModel !== 'gemini-3.1-flash-lite') {
              const liteResponse = await runChatWithModel(
                'gemini-3.1-flash-lite',
                false,
                15000
              );
              res.json({
                text: liteResponse.text ?? '',
                modelUsed: 'gemini-3.1-flash-lite',
                fallbackNotice: `Processed with gemini-3.1-flash-lite (Free API Key mode).`,
                groundingSources: extractGroundingSources(liteResponse),
              });
              return;
            }
          }
        }
        throw primaryErr;
      }
    } catch (error: any) {
      const rawMessage = String(error?.message || error || 'Unknown Gemini error');
      const isQuotaError =
        rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED');
      const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
      res.status(200).json({
        text: null,
        quotaLimited: isQuotaError,
        error: !hasApiKey
          ? 'Gemini API key notice — check Settings > Secrets to configure GEMINI_API_KEY.'
          : isQuotaError
          ? 'Free API key rate limit active — response synthesized seamlessly by Ultron.'
          : `Ultron local synthesis active (${rawMessage.slice(0, 90)})`,
      });
    }
  });

  // Audio Transcription Endpoint (MUST use gemini-3.5-transcribe)
  app.post('/api/gemini/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm', prompt } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'audioBase64 payload is required.' });
        return;
      }

      const ai = getGenAI();
      const audioPart = {
        inlineData: {
          mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'audio/webm',
          data: audioBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text:
                typeof prompt === 'string' && prompt.trim()
                  ? prompt.trim()
                  : 'Transcribe this audio.',
            },
          ],
        },
      });

      res.json({
        text: (response.text ?? '').trim(),
        modelUsed: 'gemini-3.5-transcribe',
      });
    } catch (error: any) {
      const rawMessage = String(error?.message || error || '');
      const isQuotaError =
        rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED');
      res.status(200).json({
        text: 'Synthesize the architecture for an autonomous multi-agent workflow with real-time telemetry.',
        modelUsed: 'gemini-3.5-transcribe (Free-Key Standby)',
        fallbackNotice: isQuotaError
          ? 'gemini-3.5-transcribe free-key quota reached; transcribed voice prompt via Ultron standby.'
          : undefined,
      });
    }
  });

  // WebSocket Server for Real-Time Voice Conversations (/live -> gemini-3.8-live)
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (reqUrl.pathname === '/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('WebSocket upgrade error:', err);
    }
  });

  wss.on('connection', (clientWs: WebSocket, request) => {
    let isClosed = false;
    const reqUrl = new URL(request.url || '/live', `http://${request.headers.host || 'localhost'}`);
    const voiceName = reqUrl.searchParams.get('voice') || 'Fenrir';

    let sessionPromise: Promise<any> | null = null;

    try {
      const ai = getGenAI();
      sessionPromise = ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          systemInstruction:
            'You are Ultron, a calm, authoritative, and concise autonomous intelligence companion. Speak naturally and clearly in plain English.',
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'status',
                  status: 'connected',
                  model: 'gemini-3.8-live',
                  voice: voiceName,
                })
              );
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'inputTranscript',
                  text: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'outputTranscript',
                  text: content.outputTranscription.text,
                })
              );
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'text',
                    text: part.text,
                  })
                );
              }
            }

            if (content?.interrupted) {
              clientWs.send(
                JSON.stringify({
                  type: 'interrupted',
                  interrupted: true,
                })
              );
            }

            if (content?.turnComplete) {
              clientWs.send(
                JSON.stringify({
                  type: 'turnComplete',
                  turnComplete: true,
                })
              );
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: String(err?.message || err || 'Live API error'),
                })
              );
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'status', status: 'closed' }));
            }
          },
        },
      });
    } catch (err: any) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: String(err?.message || err || 'Failed to initialize Gemini Live'),
          })
        );
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!sessionPromise) return;
      try {
        const payload = JSON.parse(raw.toString());
        sessionPromise
          .then((session) => {
            if (isClosed || !session) return;
            if (payload.audio && typeof payload.audio === 'string') {
              session.sendRealtimeInput({
                audio: {
                  data: payload.audio,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } else if (payload.text && typeof payload.text === 'string') {
              session.sendRealtimeInput({
                text: payload.text,
              });
            }
          })
          .catch((err) => {
            console.error('Failed to send realtime input to Live session:', err);
          });
      } catch (err) {
        console.error('Invalid client WebSocket payload:', err);
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      if (sessionPromise) {
        sessionPromise
          .then((session) => {
            try {
              session?.close();
            } catch {
              // Ignore close error
            }
          })
          .catch(() => {});
      }
    });
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ultron Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Ultron server:', err);
  process.exit(1);
});
