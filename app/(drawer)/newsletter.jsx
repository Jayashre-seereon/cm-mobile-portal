import { Ionicons } from '@expo/vector-icons';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { getNewsletters } from '../../src/api/newsletterApi';
import { checkModuleAccess, getModules } from '../../src/api/moduleAccessApi';
import { useAppState } from '../../src/app-state';
import { Screen, UnlockBottomSheet, mobileAssistantScrollProps } from '../../src/careermap-ui';
import { palette } from '../../src/careermap-data';
import { openSubscriptionPrompt } from '../../src/subscription-flow';
import { useSearchDeepLink } from '../../src/utils/searchNavigation';
import { buildFreeKeys, getPreviewLimit, isPreviewFree, PREVIEW_MODULES } from '../../src/utils/previewAccess';

const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, '').trim();
const getViewUrl = (item) => String(item?.image || item?.url || '').trim();

// "PDF" / "Image" / ... label shown on each card (same as the user portal).
function getFileKindLabel(url) {
  const clean = String(url || '').split('?')[0].toLowerCase();
  if (/\.(pdf)$/.test(clean)) return 'PDF';
  if (/\.(jpg|jpeg|png|webp|svg|gif)$/.test(clean)) return 'Image';
  if (/\.(doc|docx)$/.test(clean)) return 'Document';
  if (/\.(ppt|pptx)$/.test(clean)) return 'Presentation';
  if (/\.(xls|xlsx)$/.test(clean)) return 'Spreadsheet';
  if (/\.(mp4|webm|mov|ogg)$/.test(clean)) return 'Video';
  return 'File';
}

// Normalize whatever the API/route gives us into one of: 'preview' | 'locked' | 'full'
// 'unlocked' is treated as an alias for 'full'.
function normalizeMode(rawMode, allowed) {
  const mode = String(rawMode || '').trim().toLowerCase();
  if (mode === 'full' || mode === 'unlocked') return 'full';
  if (mode === 'preview') return 'preview';
  if (mode === 'locked') return 'locked';
  // No usable mode string — fall back on `allowed`, default to locked for safety.
  if (allowed === true) return 'full';
  return 'locked';
}

export default function NewsletterScreen() {
  const { preferences, isUnlocked } = useAppState();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [previewLimit, setPreviewLimit] = useState(4);
  const [selectedType, setSelectedType] = useState("ALL");
  const [resolvedAccessStatus, setResolvedAccessStatus] = useState('locked');
  const [showUnlockSheet, setShowUnlockSheet] = useState(false);
  const accessStatus = resolvedAccessStatus;
  // Same as the user portal: full access = the server says so OR the user has an active plan for it.
  const hasFullAccess = accessStatus === 'full' || isUnlocked('newsletter');
  const isPreview = accessStatus === 'preview' && !hasFullAccess;
  const isLocked = accessStatus === 'locked' && !hasFullAccess;

  useEffect(() => {
    let mounted = true;

    async function resolveAccess() {
      try {
        let moduleId = Number(params?.moduleId);
        if (!Number.isFinite(moduleId)) {
          const modules = await getModules();
          const matched = modules.find((module) => {
            const title = String(module?.title || '').trim().toLowerCase();
            return title.includes('career insights') || title.includes('career newsletter') || title.includes('newsletter');
          });
          moduleId = Number(matched?.id);
        }

        if (!Number.isFinite(moduleId)) {
          if (mounted) setResolvedAccessStatus(normalizeMode(params?.accessStatus, undefined));
          return;
        }

        const response = await checkModuleAccess(moduleId);
        if (!mounted) return;
        setResolvedAccessStatus(normalizeMode(response?.mode, response?.allowed));
        setPreviewLimit(getPreviewLimit(PREVIEW_MODULES.newsletter, response));
      } catch {
        if (mounted) setResolvedAccessStatus('locked');
      }
    }

    void resolveAccess();

    return () => {
      mounted = false;
    };
  }, [params?.accessStatus, params?.moduleId]);

  useEffect(() => {
    let mounted = true;

    async function loadNewsletters() {
      setLoading(true);
      setError('');
      try {
        const response = await getNewsletters();
        const nextItems = Array.isArray(response?.data) ? response.data : [];
        if (mounted) {
          // Newest first (the free items in preview are worked out in the same order).
          setItems([...nextItems].sort((a, b) => new Date(b?.createdAt) - new Date(a?.createdAt)));
        }
      } catch (_err) {
        if (mounted) {
          setError('Unable to load newsletters right now.');
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadNewsletters();

    return () => {
      mounted = false;
    };
  }, []);
  // The free newsletters in preview are the newest ones of the FULL list, not of whatever the
  // type filter shows, so filtering never unlocks an item.
  const previewFreeKeys = useMemo(() => buildFreeKeys(items, previewLimit), [items, previewLimit]);
const filteredItems =
  selectedType === "ALL"
    ? items
    : items.filter((item) => item.type === selectedType);
  // Global search / Career Bee: show the picked article first; its lock still follows the
  // full list's free items.
  const searchFocusActive = useSearchDeepLink(params?.searchKey, !loading, () => {
    if (typeof params?.newsletterId === 'string' && params.newsletterId) {
      setSelectedType("ALL");
    }
  });
  const focusedItem = searchFocusActive && typeof params?.newsletterId === 'string'
    ? filteredItems.find((item) => String(item?.id) === params.newsletterId)
    : null;
  const displayedItems = focusedItem ? [focusedItem, ...filteredItems.filter((item) => item !== focusedItem)] : filteredItems;
  return (
    <Screen scroll animationKey="newsletter">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-[16px]" style={{ backgroundColor: `${palette.pink}15` }}>
          <Ionicons name="newspaper-outline" size={22} color={palette.pink} />
        </View>
        <View className="flex-1">
          <Text className={`text-[22px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Career Insights</Text>
          <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Latest career updates, highlights, and links.</Text>
        </View>
        {isLocked ? (
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: '#f8e8d8' }}>
            <Ionicons name="lock-closed" size={16} color={palette.primary} />
          </View>
        ) : isPreview ? (
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.secondary}20` }}>
            <Ionicons name="time-outline" size={16} color={palette.secondary} />
          </View>
        ) : null}
      </View>

      {isLocked ? (
        <View className="mt-4 rounded-[18px] border border-dashed px-4 py-3" style={{ borderColor: `${palette.primary}30`, backgroundColor: `${palette.primary}10` }}>
          <Text className={`text-[13px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
            This module is locked.
          </Text>
          <Text className={`mt-1 text-[12px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
            Subscribe to open the career insights module.
          </Text>
        </View>
      ) : null}

      {loading ? <Text className={`mt-4 text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading newsletters...</Text> : null}
      {error ? <Text className="mt-4 text-[13px] font-semibold text-red-500">{error}</Text> : null}

      <ScrollView className="mt-4" showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
        <View className="gap-3 pb-8">
          <View className="mb-4 flex-row gap-2">
  {["ALL", "WEEKLY", "QUARTERLY"].map((type) => (
    <Pressable
      key={type}
      onPress={() => setSelectedType(type)}
      className="rounded-full px-4 py-2"
      style={{
        backgroundColor:
          selectedType === type ? palette.primary : "#f8e8d8",
      }}
    >
      <Text
        className="text-[12px] font-bold"
        style={{
          color: selectedType === type ? "#fff" : palette.primary,
        }}
      >
        {type === "ALL"
          ? "All"
          : type === "WEEKLY"
          ? "Weekly"
          : "Quarterly"}
      </Text>
    </Pressable>
  ))}
</View>
          {displayedItems.map((item) => {
            // full mode -> everything unlocked
            // preview mode -> only the first `previewLimit` items of the full list unlocked
            // locked mode -> nothing unlocked
            const cardUnlocked = hasFullAccess || (isPreview && isPreviewFree(previewFreeKeys, item));
            const viewUrl = getViewUrl(item);
            const externalUrl = String(item?.url || '').trim();
            const returnTarget = {
              pathname: '/(drawer)/newsletter',
              params: {
                moduleId: String(params?.moduleId || ''),
                accessStatus,
              },
            };

            return (
            <Pressable
              key={item?.id}
              onPress={() => {
                if (!cardUnlocked) {
                  setShowUnlockSheet(true);
                }
              }}
              className={`overflow-hidden rounded-[22px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}
            >
              <View className="flex-row items-start justify-between gap-3 p-4 pb-3">
                <View className="flex-1 gap-2">
                  <Text className="text-[10px] font-bold uppercase" style={{ color: '#b8837e', letterSpacing: 2 }}>Career Insights</Text>
                  <Text className={`text-[16px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{item?.title || 'Newsletter'}</Text>
                  {item?.description ? (
                    <Text className={`text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                      {stripHtml(item.description)}
                    </Text>
                  ) : null}
                </View>
                <View className="items-end gap-2">
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: cardUnlocked ? '#ecfdf3' : '#f8e8d8' }}>
                    <Ionicons name={cardUnlocked ? 'lock-open' : 'lock-closed'} size={16} color={cardUnlocked ? '#16a34a' : palette.primary} />
                  </View>
                  <View className="rounded-full px-3 py-1" style={{ backgroundColor: '#fdf0ee' }}>
                    <Text className="text-[8px] font-bold uppercase" style={{ color: palette.primary, letterSpacing: 1.5 }}>{getFileKindLabel(item?.image || item?.url)}</Text>
                  </View>
                </View>
              </View>
           <View className="flex-row flex-wrap items-center justify-between px-4 pb-4">
                {cardUnlocked && viewUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(viewUrl)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: palette.secondary }}
                  >
                    <Text className="text-[12px] font-bold text-white">View</Text>
                  </Pressable>
                ) : null}
                {cardUnlocked && externalUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(externalUrl)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: palette.primary }}
                  >
                    <Text className="text-[12px] font-bold text-white">Open Link</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
          })}

          {!loading && !items.length ? (
            <Text className={`text-[13px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>No newsletters available right now.</Text>
          ) : null}
        </View>
      </ScrollView>

      {showUnlockSheet ? (
        <UnlockBottomSheet
          title="Unlock Career Insights"
          subtitle="Subscribe to unlock all career insights items and open linked files."
          onClose={() => setShowUnlockSheet(false)}
          onPress={() => {
            setShowUnlockSheet(false);
            openSubscriptionPrompt({
              pathname: '/(drawer)/newsletter',
              params: {
                moduleId: String(params?.moduleId || ''),
                accessStatus,
              },
            });
          }}
        />
      ) : null}
    </Screen>
  );
}
