#!/bin/bash

# Update typography (make it lighter)
sed -i 's/font-black/font-semibold/g' App.tsx
sed -i 's/font-black/font-semibold/g' components/VoiceAssistant.tsx
sed -i 's/font-bold/font-medium/g' App.tsx
sed -i 's/font-bold/font-medium/g' components/VoiceAssistant.tsx
sed -i 's/tracking-widest/tracking-wide/g' App.tsx
sed -i 's/tracking-\[0.2em\]/tracking-wide/g' App.tsx
sed -i 's/uppercase//g' App.tsx # This might be tricky, let's keep it but make it softer. 
