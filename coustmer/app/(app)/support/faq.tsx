import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronUp, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useFaqs } from '@/lib/customer/hooks';
import type { FaqItem } from '@/lib/customer/types';

export default function FaqScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: faqs, isLoading, isError, refetch } = useFaqs();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faqs ?? [];
    return (faqs ?? []).filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        (f.answer ?? '').toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const categories = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const faq of filtered) {
      const cat = faq.category ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(faq);
    }
    return [...map.entries()].map(([cat, items]) => ({ cat, items }));
  }, [filtered]);

  function renderFaq({ item: faq }: { item: FaqItem }) {
    const expanded = expandedId === faq.id;
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.faqCard, expanded && styles.faqCardOpen]}
        onPress={() => setExpandedId(expanded ? null : faq.id)}
      >
        <View style={styles.faqRow}>
          <Text style={styles.faqQ} numberOfLines={expanded ? undefined : 2}>
            {faq.question}
          </Text>
          {expanded ? (
            <ChevronUp size={16} color="#6B7280" strokeWidth={2} />
          ) : (
            <ChevronDown size={16} color="#6B7280" strokeWidth={2} />
          )}
        </View>
        {expanded && faq.answer ? (
          <Text style={styles.faqA}>{faq.answer}</Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={20} color="#0B1220" style={{ transform: [{ rotate: '180deg' }] }} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQs</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#9CA3AF" strokeWidth={2} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search FAQs…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={authTheme.brand} />
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load FAQs.</Text>
          <TouchableOpacity onPress={() => void refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={categories}
          keyExtractor={(c) => c.cat}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? 'No FAQs match your search.' : 'No FAQs available.'}
            </Text>
          }
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.cat}</Text>
              {section.items.map((faq) => (
                <View key={faq.id}>{renderFaq({ item: faq })}</View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#0B1220',
    letterSpacing: -0.3,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#0B1220',
    height: '100%',
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#9CA3AF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  faqCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqCardOpen: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQ: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  faqA: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginTop: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorText: { fontFamily: fonts.uiSemi, fontSize: 14, color: '#EF4444', marginBottom: 12 },
  retryBtn: {
    backgroundColor: authTheme.brand,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { fontFamily: fonts.uiBold, fontSize: 14, color: '#FFFFFF' },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingTop: 40,
  },
});
