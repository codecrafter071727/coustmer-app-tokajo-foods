/**
 * GroupOrderSheet — Swiggy/Zomato-style Group Order flow
 *
 * POST /cart/share        → create group link
 * GET  /cart/share/:token → preview shared cart (no auth)
 * POST /cart/share/:token/join → join as a member
 * GET  /cart/group        → current members + lines
 * PUT  /cart/group/lock   → host locks (no more edits)
 * DELETE /cart/group/leave      → guest leave
 * DELETE /cart/group/members/:id → host kick member
 * DELETE /cart/group      → host dissolve
 */
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Lock, Share2, UserMinus, Users, X } from 'lucide-react-native';
import { useEffect } from 'react';

import { fonts } from '@/constants/typography';
import {
  useCartGroup,
  useDissolveCartGroup,
  useKickCartGroupMember,
  useLeaveCartGroup,
  useLockCartGroup,
  useShareCart,
} from '@/lib/cart/hooks';
import { useAuthStore } from '@/store/auth-store';

const ORANGE = '#F97316';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';
const BG = '#F4F5F7';

type Member = {
  userId: string;
  name?: string;
  itemCount?: number;
  isHost?: boolean;
};

function parseMember(raw: unknown): Member {
  const r = raw as Record<string, unknown>;
  return {
    userId: String(r.userId ?? r._id ?? r.id ?? ''),
    name: String(r.name ?? r.displayName ?? r.username ?? 'Member'),
    itemCount: Number(r.itemCount ?? r.items ?? 0) || undefined,
    isHost: Boolean(r.isHost ?? r.host),
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GroupOrderSheet({ visible, onClose }: Props) {
  const authUser = useAuthStore((s) => s.user);
  const shareCart = useShareCart();
  const group = useCartGroup(visible);
  const lockGroup = useLockCartGroup();
  const leaveGroup = useLeaveCartGroup();
  const kickMember = useKickCartGroupMember();
  const dissolveGroup = useDissolveCartGroup();

  const groupData = group.data as Record<string, unknown> | undefined;
  const members: Member[] = Array.isArray(groupData?.members)
    ? groupData!.members.map(parseMember)
    : [];
  const isHost =
    Boolean(groupData?.isHost) ||
    members.find((m) => m.userId === authUser?.id)?.isHost === true;
  const isLocked = Boolean(groupData?.locked ?? groupData?.isLocked);
  const shareToken = String(groupData?.shareToken ?? groupData?.token ?? '');
  const shareUrl = String(groupData?.shareUrl ?? groupData?.url ?? shareToken);

  // Create group automatically when sheet opens if none exists
  useEffect(() => {
    if (!visible || shareToken) return;
    if (group.isLoading || shareCart.isPending) return;
    // Only auto-create if no group yet
    if (!groupData || !members.length) {
      shareCart.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleShare = async () => {
    let token = shareToken;
    let url = shareUrl;

    if (!token) {
      try {
        const result = await shareCart.mutateAsync();
        token = result.shareToken;
        url = result.shareUrl;
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not create group link');
        return;
      }
    }

    const shareText = url || token;
    try {
      await Share.share({ message: `Join my group order! ${shareText}`, url: shareText });
    } catch {
      Alert.alert('Group order link', shareText || 'Could not create link');
    }
  };

  const handleCopy = async () => {
    await handleShare();
  };

  const handleLock = () => {
    Alert.alert('Lock group?', 'No one can add items after locking.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', onPress: () => lockGroup.mutate() },
    ]);
  };

  const handleLeave = () => {
    Alert.alert('Leave group?', 'Your items will be removed from this cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => leaveGroup.mutate(undefined, { onSuccess: onClose }),
      },
    ]);
  };

  const handleKick = (userId: string, name: string) => {
    Alert.alert(`Remove ${name}?`, 'Their items will be removed from the cart.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => kickMember.mutate(userId) },
    ]);
  };

  const handleDissolve = () => {
    Alert.alert('Dissolve group?', 'This will remove all members and end the group order.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dissolve',
        style: 'destructive',
        onPress: () => dissolveGroup.mutate(undefined, { onSuccess: onClose }),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <Users color={ORANGE} size={20} strokeWidth={2.2} />
              <Text style={styles.sheetTitle}>Group Order</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={TEXT_SEC} size={20} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Share link */}
          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>Invite friends to add items to your cart</Text>
            <View style={styles.linkRow}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Share2 color={WHITE} size={16} strokeWidth={2.2} />
                <Text style={styles.shareBtnText}>
                  {shareCart.isPending ? 'Creating…' : 'Share link'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Members list */}
          <Text style={styles.sectionLabel}>
            Members {members.length > 0 ? `(${members.length})` : ''}
          </Text>

          {group.isLoading ? (
            <ActivityIndicator color={ORANGE} style={{ marginVertical: 20 }} />
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>No one has joined yet. Share the link above!</Text>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(m) => m.userId}
              scrollEnabled={false}
              renderItem={({ item: member }) => (
                <View style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {(member.name || 'M')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {member.name}
                      {member.isHost ? ' (Host)' : ''}
                    </Text>
                    {member.itemCount ? (
                      <Text style={styles.memberMeta}>{member.itemCount} items</Text>
                    ) : null}
                  </View>
                  {isHost && !member.isHost && member.userId !== authUser?.id && (
                    <TouchableOpacity
                      onPress={() => handleKick(member.userId, member.name || 'Member')}
                      style={styles.kickBtn}
                    >
                      <UserMinus color="#EF4444" size={18} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}

          {/* Host actions */}
          {isHost ? (
            <View style={styles.actionRow}>
              {!isLocked && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FFF7ED', borderColor: ORANGE }]}
                  onPress={handleLock}
                  disabled={lockGroup.isPending}
                >
                  <Lock color={ORANGE} size={16} strokeWidth={2.2} />
                  <Text style={[styles.actionBtnText, { color: ORANGE }]}>Lock cart</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
                onPress={handleDissolve}
                disabled={dissolveGroup.isPending}
              >
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Dissolve group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
              <Text style={styles.leaveBtnText}>Leave group</Text>
            </TouchableOpacity>
          )}

          {isLocked && (
            <View style={styles.lockedBanner}>
              <Lock color={ORANGE} size={14} strokeWidth={2} />
              <Text style={styles.lockedText}>Cart is locked — no more items can be added</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  sheetHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  dragPill: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  sheetTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 17, color: TEXT },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  linkBox: { backgroundColor: BG, borderRadius: 14, padding: 14, marginBottom: 18 },
  linkLabel: { fontFamily: fonts.ui, fontSize: 13, color: TEXT_SEC, marginBottom: 10 },
  linkRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 12 },
  shareBtnText: { fontFamily: fonts.uiBold, fontSize: 14, color: WHITE },
  copyBtn: { paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE },
  copyBtnText: { fontFamily: fonts.uiSemi, fontSize: 14, color: TEXT },
  sectionLabel: { fontFamily: fonts.displayBold, fontSize: 14, color: TEXT, marginBottom: 10 },
  emptyText: { fontFamily: fonts.ui, fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginVertical: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontFamily: fonts.uiBold, fontSize: 16, color: ORANGE },
  memberName: { fontFamily: fonts.uiSemi, fontSize: 14, color: TEXT },
  memberMeta: { fontFamily: fonts.ui, fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  kickBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  actionBtnText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  leaveBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' },
  leaveBtnText: { fontFamily: fonts.uiSemi, fontSize: 14, color: '#EF4444' },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, marginTop: 12 },
  lockedText: { fontFamily: fonts.ui, fontSize: 12, color: ORANGE, flex: 1 },
});
