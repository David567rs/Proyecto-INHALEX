import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Animated, AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/core/theme/colors';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const videoSource = require('../../../../../assets/home/Aplicar.mp4');
// Mobile copy of Client/public/videos/Aplicar.mp4: 1260 × 720, all 324 frames / 10.8 seconds.
// Preserve the original 7:4 composition without cropping; H.264 Baseline 3.1 reduces decoder demands.
const VIDEO_ASPECT_RATIO = 7 / 4;

export function ExperienceVideo() {
  const { width } = useWindowDimensions();
  const mediaWidth = Math.max(1, Math.min(width, 600) - 44);
  const reducedMotion = useReducedMotion();
  const mounted = useRef(true);
  const manuallyPaused = useRef(false);
  const [firstFrameVisible, setFirstFrameVisible] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  // Run this cleanup before useVideoPlayer releases its native instance.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.staysActiveInBackground = false;
    instance.showNowPlayingNotification = false;
    if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') instance.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const failed = status === 'error' || retryFailed;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!mounted.current) return;
      if (state === 'active' && !manuallyPaused.current) player.play();
      else player.pause();
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (!firstFrameVisible) { opacity.setValue(0); return; }
    if (reducedMotion !== false) { opacity.setValue(1); return; }
    const animation = Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [firstFrameVisible, opacity, reducedMotion]);

  function togglePlayback() {
    if (!mounted.current) return;
    manuallyPaused.current = isPlaying;
    if (isPlaying) player.pause();
    else player.play();
  }

  async function retry() {
    if (!mounted.current) return;
    setRetrying(true);
    setRetryFailed(false);
    setFirstFrameVisible(false);
    try {
      await player.replaceAsync(videoSource);
      if (!mounted.current) return;
      if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive' && !manuallyPaused.current) player.play();
    } catch {
      if (mounted.current) setRetryFailed(true);
    } finally {
      if (mounted.current) setRetrying(false);
    }
  }

  return (
    <View style={[styles.card, { width: mediaWidth }]}>
      <View style={[styles.frame, { width: mediaWidth, height: mediaWidth / VIDEO_ASPECT_RATIO }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
          <VideoView
            accessibilityLabel="Modo de uso INHALEX: aplica, frota e inhala"
            contentFit="contain"
            fullscreenOptions={{ enable: false }}
            nativeControls={false}
            onFirstFrameRender={() => { if (mounted.current) setFirstFrameVisible(true); }}
            player={player}
            playsInline
            surfaceType="textureView"
            allowsPictureInPicture={false}
            style={{ width: mediaWidth, height: mediaWidth / VIDEO_ASPECT_RATIO }}
          />
        </Animated.View>
        {!firstFrameVisible && !failed ? <View style={styles.loading} accessibilityLabel="Cargando el vídeo de INHALEX"><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Tu pausa empieza aquí</Text></View> : null}
        {failed ? <View style={styles.error} accessibilityLiveRegion="polite"><Ionicons name="videocam-outline" size={24} color={colors.primary} /><Text style={styles.errorTitle}>No se pudo reproducir el vídeo</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: retrying }} disabled={retrying} onPress={() => void retry()} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryLabel}>{retrying ? 'Cargando…' : 'Volver a intentar'}</Text></Pressable></View> : null}
      </View>
      <View style={styles.caption}>
        <View style={styles.captionCopy}><Ionicons name="repeat-outline" size={15} color={colors.primary} /><Text style={styles.captionText}>Aplica · frota · inhala</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pausar vídeo de INHALEX' : 'Reproducir vídeo de INHALEX'} accessibilityState={{ disabled: failed || retrying }} disabled={failed || retrying} onPress={togglePlayback} style={({ pressed }) => [styles.control, pressed && styles.pressed, (failed || retrying) && styles.disabled]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color={colors.primaryDark} />
          <Text style={styles.controlLabel}>{isPlaying ? 'Pausar' : 'Reproducir'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'center', backgroundColor: '#EDF4E8', borderRadius: 22, marginTop: 22, overflow: 'hidden' },
  frame: { backgroundColor: colors.white, overflow: 'hidden' },
  loading: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, alignItems: 'center', gap: 9, justifyContent: 'center' },
  loadingText: { color: colors.textMuted, fontSize: 11 },
  error: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, alignItems: 'center', backgroundColor: colors.surfaceSoft, gap: 10, justifyContent: 'center', padding: 18 },
  errorTitle: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  retry: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  retryLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  caption: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 3 },
  captionCopy: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 6, minHeight: 44 },
  captionText: { color: colors.primaryDark, flexShrink: 1, fontSize: 11, fontWeight: '500' },
  control: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 44, paddingHorizontal: 5 },
  controlLabel: { color: colors.primaryDark, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
});
