const audioCtx = new AudioContext();
const sampleRate = audioCtx.sampleRate;

function generateSuccessSoundBuffer() {
  const duration = 0.25; // seconds
  const frequency = 880; // Hz
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
export function playSuccessSound() {
  const source = audioCtx.createBufferSource();
  source.buffer = successSoundBuffer;
  source.playbackRate.value = 0.9 + Math.random() * 0.5;
  source.connect(audioCtx.destination);
  source.start();
}

function generateFailureSoundBuffer() {
  const duration = 0.5; // seconds
  const frequency = 220; // Hz
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    // linear taper off
    const volume = 1 - time / duration;
    // triangle wave
    const t = (time * frequency) % 1;
    const triangle = t < 0.5 ? t * 4 - 1 : (1 - t) * 4 - 1;
    data[i] = triangle * volume;
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
