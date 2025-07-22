/**
 * src/components/dashboard/Gauge.tsx
 *
 * A complex SVG-based gauge component for displaying temperature readings.
 */
import React from 'react';
// UPDATED: Import useWindowDimensions
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Svg, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

// REMOVED: Static screen width is no longer used
// const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GaugeProps = {
  value: number;
  min: number;
  max: number;
  lowThreshold: number;
  highThreshold: number;
  label: string;
  Icon: React.FC<any>; // Icon component from lucide-react-native
  size?: number; // ADDED: Optional size prop
};

export const Gauge: React.FC<GaugeProps> = ({ value, min, max, lowThreshold, highThreshold, label, Icon, size: propSize }) => {
  // UPDATED: Get screen width dynamically
  const { width: screenWidth } = useWindowDimensions();
  // Use the passed size prop, or calculate a default based on the current screen width
  const size = propSize || screenWidth * 0.7;

  const strokeWidth = 25;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const totalAngle = 270;
  const startAngle = -135;

  const polarToCartesian = (angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180.0;
    const x = center + radius * Math.cos(a);
    const y = center + radius * Math.sin(a);
    return { x, y };
  };

  const valueToAngle = (val: number) => {
    const percentage = Math.max(0, Math.min(1, (val - min) / (max - min)));
    return startAngle + percentage * totalAngle;
  };

  const valueAngle = valueToAngle(value);
  const lowAngle = valueToAngle(lowThreshold);
  const highAngle = valueToAngle(highThreshold);
  const startPoint = polarToCartesian(startAngle);
  const lowPoint = polarToCartesian(lowAngle);
  const highPoint = polarToCartesian(highAngle);
  const endPoint = polarToCartesian(startAngle + totalAngle);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
            <LinearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#5b9dff" /><Stop offset="100%" stopColor="#3478db" /></LinearGradient>
            <LinearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#34d399" /><Stop offset="100%" stopColor="#10b981" /></LinearGradient>
            <LinearGradient id="redGradient" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#fb7185" /><Stop offset="100%" stopColor="#f43f5e" /></LinearGradient>
        </Defs>

        <Path d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 1 1 ${endPoint.x} ${endPoint.y}`} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
        <Path d={`M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${lowAngle - startAngle > 180 ? 1 : 0} 1 ${lowPoint.x} ${lowPoint.y}`} stroke="url(#blueGradient)" strokeWidth={strokeWidth} fill="none" />
        <Path d={`M ${lowPoint.x} ${lowPoint.y} A ${radius} ${radius} 0 ${highAngle - lowAngle > 180 ? 1 : 0} 1 ${highPoint.x} ${highPoint.y}`} stroke="url(#greenGradient)" strokeWidth={strokeWidth} fill="none" />
        <Path d={`M ${highPoint.x} ${highPoint.y} A ${radius} ${radius} 0 ${startAngle + totalAngle - highAngle > 180 ? 1 : 0} 1 ${endPoint.x} ${endPoint.y}`} stroke="url(#redGradient)" strokeWidth={strokeWidth} fill="none" />

        <G transform={`rotate(${valueAngle}, ${center}, ${center})`}>
          <Path d={`M ${center - 6} ${center - radius + strokeWidth} L ${center} ${strokeWidth / 2} L ${center + 6} ${center - radius + strokeWidth} Z`} fill={COLORS.text} />
        </G>
      </Svg>
      <View style={styles.gaugeContent}>
        <Icon color={COLORS.cyan} size={48} />
        <Text style={styles.gaugeValue}>{value.toFixed(1)}°C</Text>
        <Text style={styles.gaugeLabel}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    gaugeContent: { position: 'absolute', alignItems: 'center' },
    gaugeValue: { color: COLORS.text, fontSize: 48, fontWeight: 'bold', marginTop: 8 },
    gaugeLabel: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 1.5 },
});
