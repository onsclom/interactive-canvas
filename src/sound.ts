const audioCtx = new AudioContext();
const sampleRate = audioCtx.sampleRate;

function generateSuccessSoundBuffer() {
  const duration = 0.25; // seconds
  const frequency = 440; // Hz
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    // linear taper off
    const volume = 1 - time / duration;
    data[i] = Math.sin(2 * Math.PI * frequency * time) * volume;
  }
  return buffer;
}
const successSoundBuffer = generateSuccessSoundBuffer();
export function playSuccessSound(score: number) {
  const source = audioCtx.createBufferSource();
  source.buffer = successSoundBuffer;
  // higher score -> higher pitch
  source.playbackRate.value = 1 + score * 0.05;
  source.connect(audioCtx.destination);
  source.start();
}

function generatedPerfectHitSoundBuffer() {
  const duration = 0.1; // seconds
  const frequency = 880; // Hz
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    // linear taper off
    const volume = 1 - time / duration;
    // square wave
    data[i] =
      Math.sign(Math.sin(2 * Math.PI * frequency * time)) * 0.5 * volume;
  }
  return buffer;
}
const perfectHitSoundBuffer = generatedPerfectHitSoundBuffer();
export function playPerfectHitSound(score: number) {
  const source = audioCtx.createBufferSource();
  source.buffer = perfectHitSoundBuffer;
  // higher score -> higher pitch
  source.playbackRate.value = 1 + score * 0.05;
  source.connect(audioCtx.destination);
  source.start();
}

function generateFailureSoundBuffer() {
  const duration = 0.5; // seconds
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    // linear taper off
    const volume = 1 - time / duration;
    // white noise
    const noise = (Math.random() * 2 - 1) * 0.3;
    data[i] = noise * volume;
  }
  return buffer;
}
const failureSoundBuffer = generateFailureSoundBuffer();
export function playFailureSound() {
  const source = audioCtx.createBufferSource();
  source.buffer = failureSoundBuffer;
  source.playbackRate.value = 0.9 + Math.random() * 0.5;
  source.connect(audioCtx.destination);
  source.start();
}
