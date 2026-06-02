import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

// Nisab threshold: approx 85g gold × PKR ~27,000/g = ~2,295,000 PKR
const NISAB_PKR = 2295000;
const ZAKAT_RATE = 0.025;

function formatPKR(n: number): string {
  return `PKR ${Math.round(n).toLocaleString('en-PK')}`;
}

export function ZakatCalculator() {
  const { colors } = useTheme();
  const [wealth, setWealth] = useState('');
  const [debts, setDebts] = useState('');
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(() => {
    const w = parseFloat(wealth.replace(/,/g, '')) || 0;
    const d = parseFloat(debts.replace(/,/g, '')) || 0;
    const net = Math.max(0, w - d);
    if (net < NISAB_PKR) return { zakat: 0, aboveNisab: false, net };
    return { zakat: net * ZAKAT_RATE, aboveNisab: true, net };
  }, [wealth, debts]);

  return (
    <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="calculator-variant" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text1 }]}>Zakat Calculator</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.text3}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.inputRow}>
            <Text style={[styles.label, { color: colors.text2 }]}>Total Wealth (PKR)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.glass3, color: colors.text1, borderColor: colors.border2 }]}
              value={wealth}
              onChangeText={setWealth}
              keyboardType="numeric"
              placeholder="e.g. 3000000"
              placeholderTextColor={colors.text4}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={[styles.label, { color: colors.text2 }]}>Debts / Liabilities (PKR)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.glass3, color: colors.text1, borderColor: colors.border2 }]}
              value={debts}
              onChangeText={setDebts}
              keyboardType="numeric"
              placeholder="e.g. 500000"
              placeholderTextColor={colors.text4}
            />
          </View>
          <View style={[styles.result, { backgroundColor: result.aboveNisab ? colors.primaryDim : colors.glass1, borderColor: result.aboveNisab ? colors.primary : colors.border1 }]}>
            {result.net > 0 ? (
              <>
                <Text style={[styles.resultLabel, { color: colors.text3 }]}>Net Wealth</Text>
                <Text style={[styles.resultValue, { color: colors.text1 }]}>{formatPKR(result.net)}</Text>
                {result.aboveNisab ? (
                  <>
                    <Text style={[styles.resultLabel, { color: colors.text3, marginTop: spacing.sm }]}>Zakat Due (2.5%)</Text>
                    <Text style={[styles.resultValue, { color: colors.primary }]}>{formatPKR(result.zakat)}</Text>
                  </>
                ) : (
                  <Text style={[styles.resultNote, { color: colors.text3 }]}>
                    Below Nisab ({formatPKR(NISAB_PKR)}) — no Zakat due
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.resultNote, { color: colors.text4 }]}>Enter your wealth to calculate</Text>
            )}
          </View>
          <Text style={[styles.disclaimer, { color: colors.text4 }]}>
            * Based on approx. Nisab of 85g gold. Consult a scholar for exact ruling.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  body: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  inputRow: { gap: 6 },
  label: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  result: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: spacing.xs,
    gap: 2,
  },
  resultLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  resultValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  resultNote: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  disclaimer: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
});
