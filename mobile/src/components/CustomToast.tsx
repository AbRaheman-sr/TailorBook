import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';
import Ionicons from '@expo/vector-icons/Ionicons';

interface SonnerToastProps extends BaseToastProps {
  type: 'success' | 'error' | 'info';
}

function SonnerToast({ text1, text2, type }: SonnerToastProps) {
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isInfo = type === 'info';

  const iconName = isSuccess
    ? 'checkmark-circle'
    : isError
    ? 'alert-circle'
    : 'information-circle';

  const iconColor = isSuccess
    ? '#10B981'
    : isError
    ? '#EF4444'
    : '#3B82F6';

  const badgeBg = isSuccess
    ? '#ECFDF5'
    : isError
    ? '#FEF2F2'
    : '#EFF6FF';

  const borderColor = isSuccess
    ? '#A7F3D0'
    : isError
    ? '#FECACA'
    : '#BFDBFE';

  return (
    <View style={[styles.container, { borderColor }]}>
      <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <SonnerToast {...props} type="success" />,
  error: (props: BaseToastProps) => <SonnerToast {...props} type="error" />,
  info: (props: BaseToastProps) => <SonnerToast {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    width: '92%',
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 16,
  },
});
