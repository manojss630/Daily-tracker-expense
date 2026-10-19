import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ExpenseRecord, ExpenseItem } from '@/types';
import {
  fetchExpenseRecordById,
  deleteExpenseRecord,
  duplicateRecord,
} from '@/services/expenseService';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Colors, Spacing, FontSizes, BorderRadius, CATEGORY_ICONS } from '@/constants/theme';
import { formatCurrency, formatDateLong, safeNumber } from '@/utils/format';
import { getFriendlyError } from '@/utils/errors';
import { generateExpensePDF, sharePDF } from '@/utils/pdf';
import {
  ChevronLeft,
  Edit3,
  Trash2,
  FileText,
  Share2,
  Copy,
  Download,
  Calendar,
  MapPin,
  Phone,
  CheckCircle,
} from 'lucide-react-native';

export default function RecordDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [record, setRecord] = useState<ExpenseRecord | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);
  const [pdfModal, setPdfModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    try {
      const data = await fetchExpenseRecordById(params.id);
      if (data) {
        setRecord(data);
        setItems(data.expense_items || []);
        setError(null);
      } else {
        setError('Record not found.');
      }
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExpenseRecord(params.id);
      router.back();
    } catch (e) {
      setActionError(getFriendlyError(e));
      setDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!record) return;
    setPdfLoading(true);
    setActionError(null);
    try {
      const uri = await generateExpensePDF(record, items, profile);
      setPdfSuccess(uri);
      setPdfModal(true);
    } catch (e) {
      setActionError(getFriendlyError(e));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePDF = async () => {
    if (!pdfSuccess) return;
    try {
      await sharePDF(pdfSuccess);
    } catch (e) {
      setActionError(getFriendlyError(e));
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateRecord(params.id);
      router.back();
    } catch (e) {
      setActionError(getFriendlyError(e));
    }
  };

  if (loading) return <LoadingState label="Loading record..." fullScreen />;
  if (error && !record) return <ErrorState message={error} onRetry={loadRecord} />;

  const total = items.reduce((sum, item) => sum + safeNumber(item.amount), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.title}>Record Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.receipt}>
        <View style={styles.receiptHeader}>
          <Text style={styles.receiptTitle}>EXPENSE STATEMENT</Text>
          <View style={styles.receiptDivider} />
        </View>

        <View style={styles.personSection}>
          <Text style={styles.personName}>{record?.person_name}</Text>
          <View style={styles.metaRow}>
            <Calendar size={14} color={Colors.neutral[500]} />
            <Text style={styles.metaText}>{formatDateLong(record?.record_date || new Date())}</Text>
          </View>
          {record?.person_phone ? (
            <View style={styles.metaRow}>
              <Phone size={14} color={Colors.neutral[500]} />
              <Text style={styles.metaText}>{record.person_phone}</Text>
            </View>
          ) : null}
          {record?.location ? (
            <View style={styles.metaRow}>
              <MapPin size={14} color={Colors.neutral[500]} />
              <Text style={styles.metaText}>{record.location}</Text>
            </View>
          ) : null}
          {record?.description ? (
            <Text style={styles.description}>{record.description}</Text>
          ) : null}
        </View>

        <View style={styles.itemsList}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsHeaderItem}>Expense</Text>
            <Text style={styles.itemsHeaderAmt}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemEmoji}>
                  {CATEGORY_ICONS[item.category as string] || '\u{1F4E6}'}
                </Text>
                <View>
                  <Text style={styles.itemName}>{item.expense_name}</Text>
                  {item.category && item.category !== 'Other' && (
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  )}
                  {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                </View>
              </View>
              <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>
      </View>

      {actionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push({ pathname: '/record-form', params: { id: record?.id } })}
        >
          <Edit3 size={22} color={Colors.primary[600]} />
          <Text style={styles.actionTileText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={handleGeneratePDF} disabled={pdfLoading}>
          {pdfLoading ? (
            <Text style={styles.actionTileText}>...</Text>
          ) : (
            <>
              <FileText size={22} color={Colors.secondary[600]} />
              <Text style={styles.actionTileText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={handleDuplicate}>
          <Copy size={22} color={Colors.accent[600]} />
          <Text style={styles.actionTileText}>Duplicate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => setDeleteModal(true)}>
          <Trash2 size={22} color={Colors.error[500]} />
          <Text style={styles.actionTileText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={deleteModal}
        title="Delete Record?"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(false)}
      />

      <Modal visible={pdfModal} onClose={() => setPdfModal(false)} title="PDF Generated">
        <View style={styles.pdfSuccess}>
          <View style={styles.pdfSuccessIcon}>
            <CheckCircle size={48} color={Colors.success[500]} />
          </View>
          <Text style={styles.pdfSuccessTitle}>PDF generated successfully!</Text>
          <Text style={styles.pdfSuccessSubtitle}>
            Your expense statement is ready to share.
          </Text>
          <View style={styles.pdfActions}>
            <Button label="Share PDF" onPress={handleSharePDF} fullWidth size="md" icon={<Share2 size={18} color="#fff" />} />
            <View style={{ height: Spacing.sm }} />
            <Button
              label="Open PDF"
              onPress={() => sharePDF(pdfSuccess || '')}
              variant="outline"
              fullWidth
              size="md"
              icon={<Download size={18} color={Colors.primary[600]} />}
            />
            <View style={{ height: Spacing.sm }} />
            <Button
              label="Generate Again"
              onPress={() => {
                setPdfModal(false);
                handleGeneratePDF();
              }}
              variant="ghost"
              fullWidth
              size="md"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg + 8,
    paddingBottom: Spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[800],
    fontFamily: 'Inter-SemiBold',
  },
  receipt: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    padding: Spacing.lg,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  receiptTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.primary[600],
    letterSpacing: 1.5,
  },
  receiptDivider: {
    width: 60,
    height: 3,
    backgroundColor: Colors.primary[400],
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  personSection: {
    marginBottom: Spacing.lg,
  },
  personName: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.neutral[800],
    fontFamily: 'Inter-ExtraBold',
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[600],
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.neutral[600],
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: Spacing.md,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.neutral[200],
  },
  itemsHeaderItem: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsHeaderAmt: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.neutral[100],
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  itemCategory: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    marginTop: 1,
  },
  itemNote: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[400],
    fontStyle: 'italic',
    marginTop: 1,
  },
  itemAmount: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.primary[400],
  },
  totalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary[700],
  },
  totalAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.primary[600],
    fontFamily: 'Inter-ExtraBold',
  },
  errorBox: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.error[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error[700],
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    gap: Spacing.xs + 2,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTileText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  pdfSuccess: {
    alignItems: 'center',
  },
  pdfSuccessIcon: {
    marginBottom: Spacing.md,
  },
  pdfSuccessTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[800],
    textAlign: 'center',
  },
  pdfSuccessSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  pdfActions: {
    width: '100%',
  },
});
