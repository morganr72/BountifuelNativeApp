/**
 * src/components/dashboard/StatusDisplay.tsx
 *
 * Visualizes the current status of the heating system sources and targets.
 */
import React from 'react';
import { View } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { FlameIcon, HeatPumpIcon, RadiatorIcon, WaterDropletIcon } from '../CustomIcons';

type RunningStatus = {
  gas: 'heating' | 'water' | 'none';
  hp: 'heating' | 'water' | 'none';
};

type StatusDisplayProps = {
  status: RunningStatus;
};

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  const currentStatus = status || { gas: 'none', hp: 'none' };
  const isSourceActive = (system: keyof RunningStatus) => currentStatus[system] !== 'none';
  const isTargetActive = (target: 'heating' | 'water') =>
    currentStatus.gas === target || currentStatus.hp === target;
  const pipeColor = (isActive: boolean) => (isActive ? COLORS.green : 'rgba(255,255,255,0.3)');

  return (
    <View style={{ width: 120, height: 80 }}>
      <Svg height="100%" width="100%" viewBox="0 0 100 70">
        <Path d="M20 15 C 20 35, 20 35, 20 55" strokeWidth="2" fill="none" stroke={pipeColor(currentStatus.gas === 'heating')} />
        <Path d="M20 15 C 50 15, 50 55, 80 55" strokeWidth="2" fill="none" stroke={pipeColor(currentStatus.gas === 'water')} />
        <Path d="M80 15 C 50 15, 50 55, 20 55" strokeWidth="2" fill="none" stroke={pipeColor(currentStatus.hp === 'heating')} />
        <Path d="M80 15 C 80 35, 80 35, 80 55" strokeWidth="2" fill="none" stroke={pipeColor(currentStatus.hp === 'water')} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        <FlameIcon color={isSourceActive('gas') ? COLORS.green : COLORS.text} />
        <HeatPumpIcon color={isSourceActive('hp') ? COLORS.green : COLORS.text} />
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        <RadiatorIcon color={isTargetActive('heating') ? COLORS.green : COLORS.text} />
        <WaterDropletIcon color={isTargetActive('water') ? COLORS.green : COLORS.text} />
      </View>
    </View>
  );
};
