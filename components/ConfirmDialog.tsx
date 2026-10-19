import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Spacing } from '@/constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Button label={cancelLabel} onPress={onCancel} variant="outline" size="md" style={{ flex: 1 }} />
        <View style={{ width: Spacing.sm }} />
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          variant={danger ? 'danger' : 'primary'}
          size="md"
          loading={loading}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
