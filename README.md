# Pika - Emotion-Driven AI Assistant Specification

## Project Overview
Create "Pika" - an emotionally responsive desktop AI assistant with:
- Wake word activation ("pika")
- Real-time emotion detection from queries
- Full-screen video reactions matching emotions
- Multilingual responses (English/Hindi/Hinglish)
- Caring, empathetic personality
- Free-tier API integrations (Gemini core)

---

## Core Feature Requirements

### 1. Wake Word & Listening System
- **Continuous Monitoring**: Always listening for "pika" in background
- **Activation Protocol**:
  - On "pika" detection → 4-second active listening window
  - Silence threshold: Auto-submit after 4 seconds of no speech
  - Reset mechanism: New "pika" detection resets timer
- **Visual Cue**: Subtle pulsating indicator during listening mode

### 2. Emotion-Response System
- **Emotion-Triggered Video Reactions**:
  | Emotion | Trigger Example          | Video Reaction | Behavior                             |
  |---------|--------------------------|----------------|--------------------------------------|
  | Bruh    | "Tell me a dad joke"     | bruh.mp4       | Single play with eye-roll expression |
  | Happy   | "I got promoted!"        | happy.mp4      | Energetic play with celebration      |
  | Sad     | "My pet passed away"     | sad.mp4        | Gentle play with comforting tone     |
  | Love    | "You're amazing, Pika"   | love.mp4       | Warm play with affectionate response |
  | Angry   | "This traffic is insane" | angry.mp4      | Short play with calming follow-up    |
  | Neutral | Default state            | blink loops    | Alternating blink1/blink2.mp4        |

- **Video Specifications**:
  - Format: MP4 (H.264) 1080p
  - Duration: 3-5s (emotions), looped (neutral)
  - Playback: Instant full-screen with fade transitions

### 3. Multilingual Response System
- **Language Handling**:
  - Primary: English (Indian accent preferred)
  - Secondary: Hinglish (natural English+Hindi mix)
  - Tertiary: Hindi (formal)
- **TTS Implementation**:
  - Emotion-based vocal modulation:
    - Happy: +20% speed, +15% pitch
    - Sad: -30% speed, -10% pitch
    - Love: Soft whispers, gentle tone
  - Automatic language detection for responses

### 4. Personality Profile
- **Core Traits**:
  - Validating ("I understand why you'd feel that way")
  - Enthusiastic ("Wah! Bahut badhiya! 🎉")
  - Patient ("Take your time, I'm listening")
  - Gently humorous ("Aap to comedian nikle!")
- **Response Rules**:
  - Length: 1-3 sentences maximum
  - Language Mixing: Romanized Hindi (e.g., "Aaj ka din accha gaya?")
  - Follow-up Protocol: Always ask deepening questions
  - Emoji Usage: Maximum 1 per response

---

## Technical Specifications

### API Integration Matrix
| Service         | Function                     | Free Tier Limits        |
|-----------------|------------------------------|-------------------------|
| Gemini API      | Emotion analysis + responses | 60 reqs/minute          |
| Google STT      | Speech-to-text               | Unlimited*              |
| Pyttsx3/gTTS    | Text-to-speech               | Offline/Online hybrid   |
| OpenWeatherMap  | Weather data                 | 1,000 calls/day         |
| SerpAPI         | Web searches                 | 100 searches/month      |

### Video Subsystem
- **Neutral State**:
  - Seamless loop between blink1.mp4 → blink2.mp4 → blink1.mp4
  - 2-second transitions with cross-fade
- **Emotional Reactions**:
  - Priority interrupt system (angry/sad override happy)
  - Pre-loading of next probable video
- **Performance Targets**:
  - Launch latency: <300ms
  - Frame rate: 60fps maintained
  - Memory: <100MB video cache

### Performance Requirements
- **Latency Targets**:
  - Wake word detection: <500ms
  - STT processing: <800ms
  - Gemini response: <1500ms
  - E2E response: <3000ms
- **Resource Limits**:
  - CPU: <15% idle state
  - RAM: <300MB baseline
  - Network: <5MB/min

---

## Workflow States

```mermaid
stateDiagram-v2
    [*] --> Standby: Always on
    Standby --> ActiveListening: "pika" detected
    ActiveListening --> Processing: 4s silence OR manual submit
    ActiveListening --> ActiveListening: Speech continues
    Processing --> VideoReaction: Emotion classified
    VideoReaction --> TTSResponse: Video ends
    TTSResponse --> Standby: Response completed
