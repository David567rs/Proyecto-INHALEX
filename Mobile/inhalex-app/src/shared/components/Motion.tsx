import { useEffect, useState, type PropsWithChildren } from 'react';
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Reveal({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion !== false) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 440, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reducedMotion]);

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function SoftPressable({ children, style, onPressIn, onPressOut, ...props }: PressableProps) {
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => () => scale.stopAnimation(), [scale]);

  function animate(toValue: number) {
    if (reducedMotion !== false) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue, damping: 22, stiffness: 380, mass: 0.5, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(event) => { animate(0.975); onPressIn?.(event); }}
        onPressOut={(event) => { animate(1); onPressOut?.(event); }}
      >{children}</Pressable>
    </Animated.View>
  );
}
