/**
 * src/components/CustomIcons.tsx
 *
 * Contains reusable custom SVG icon components.
 * Using Svg from react-native-svg allows for scalable and color-able icons.
 */
import React from 'react';
import { Svg, Path, Rect, Circle, Line, SvgProps } from 'react-native-svg';
import { COLORS } from '../constants/colors';

// Default props for icons to ensure they have a size and color if not provided
const defaultIconProps: SvgProps = {
  width: 24,
  height: 24,
  stroke: COLORS.text,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
};

export const FlameIcon = (props: SvgProps) => (
  <Svg {...defaultIconProps} {...props}>
    <Path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
  </Svg>
);

export const HeatPumpIcon = (props: SvgProps) => (
  <Svg {...defaultIconProps} {...props}>
    <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <Circle cx="12" cy="12" r="3" />
    <Line x1="12" y1="7" x2="12" y2="17" />
    <Line x1="17" y1="12" x2="7" y2="12" />
    <Line x1="15.54" y1="8.46" x2="8.46" y2="15.54" />
    <Line x1="15.54" y1="15.54" x2="8.46" y2="8.46" />
  </Svg>
);

export const RadiatorIcon = (props: SvgProps) => (
  <Svg {...defaultIconProps} {...props}>
    <Rect width="20" height="12" x="2" y="6" rx="2" />
    <Path d="M6 6V4" />
    <Path d="M10 6V4" />
    <Path d="M14 6V4" />
    <Path d="M18 6V4" />
  </Svg>
);

export const WaterDropletIcon = (props: SvgProps) => (
  <Svg {...defaultIconProps} {...props}>
    <Path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 007 7z" />
  </Svg>
);
