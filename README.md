# 🖐️ HoloHand - Gesture Interface Art System

HoloHand is a real-time, AI-powered hand-tracking interface inspired by futuristic sci-fi hologram UIs. It turns your webcam into a spatial input device, allowing you to manipulate virtual objects directly in the air using natural hand gestures.

## 🚀 Features

- **Real-time AI Hand Tracking:** Powered by MediaPipe Hands for low-latency, high-precision gesture recognition.
- **Futuristic Holographic UI:** A cyberpunk-inspired aesthetic with scanlines, flickers, and technical HUD overlays.
- **Gesture-Based Interaction:**
  - **Pinch:** Select and move objects.
  - **Grab:** Rotate or manipulate larger elements.
- **Mouse Simulation Mode:** Use your mouse as a virtual hand (hold **Shift** to toggle between Pinch and Grab modes).
- **Technical HUD:** Real-time monitoring of coordinates, velocity, latency, and neural link status.
- **Interactive Tutorial:** A guided onboarding experience to help users master the "Neural Link."

## 🎮 Controls

### Hand Gestures
- **Move Hand:** Move the cursor/focus.
- **Pinch (Index + Thumb):** Primary interaction (Select/Drag).
- **Grab (All fingers closed):** Secondary interaction (Rotate/Special).

### Mouse Fallback
- **Move Mouse:** Move the virtual hand.
- **Click:** Pinch gesture.
- **Shift + Click:** Grab gesture.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS (v4)
- **Icons:** Lucide React
- **AI Engine:** MediaPipe Hands (@mediapipe/hands)
- **Animations:** Framer Motion (motion/react)
- **Build Tool:** Vite

## 🛠️ Installation & Setup
- Head over to https://holohand.vercel.app and run it there.

## 🛡️ Permissions

This application requires **Camera Access** to function. All processing is done locally in your browser using MediaPipe; no video data is ever sent to a server.

## 🎨 Aesthetic

The project follows a "Technical Brutalist" and "Cyberpunk" design language:
- **Primary Color:** Cyan (#06b6d4)
- **Accent Color:** Pink (#ec4899)
- **Typography:** Orbitron (Headings) & Rajdhani (UI/Data)
- **Effects:** CRT scanlines, subtle screen flicker, and chromatic aberration.

---
*Created with ❤️ for the future of spatial computing by Shourya Mishra.*