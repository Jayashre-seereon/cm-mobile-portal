import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Children, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from './app-state';
import { AnimatedBackground } from './animated-background';
import { palette } from './careermap-data';
import { StaggerFadeUpItem, ZoomInPage } from './page-transition';

export const mobileAssistantScrollProps = {
    scrollEventThrottle: 16,
    onScrollBeginDrag: () => DeviceEventEmitter.emit('careermap:scroll-active'),
    onMomentumScrollBegin: () => DeviceEventEmitter.emit('careermap:scroll-active'),
    onScrollEndDrag: () => DeviceEventEmitter.emit('careermap:scroll-idle'),
    onMomentumScrollEnd: () => DeviceEventEmitter.emit('careermap:scroll-idle'),
};

export function Screen({ children, scroll = true, contentContainerClassName = 'gap-[18px] px-5 py-5', animationKey = 'default' }) {
    const { preferences } = useAppState();
    const insets = useSafeAreaInsets();
    const childArray = Children.toArray(children);
    const animatedChildren = childArray.map((child, index) => (<StaggerFadeUpItem key={index} index={index} style={!scroll && (childArray.length === 1 || index > 0) ? { flex: 1, minHeight: 0 } : undefined}>
      {child}
    </StaggerFadeUpItem>));
    const contentPaddingBottom = Math.max(insets.bottom + 120, 140);
    return (<SafeAreaView className={`flex-1 ${preferences.darkMode ? 'bg-[#050505]' : 'bg-paper'}`} edges={['top']}>
      <AnimatedBackground />
      <ZoomInPage key={animationKey} style={{ flex: 1 }}>
        {scroll ? (<ScrollView className="flex-1" contentContainerClassName={contentContainerClassName} contentContainerStyle={{ paddingBottom: contentPaddingBottom }} showsVerticalScrollIndicator={false} {...mobileAssistantScrollProps}>
            {animatedChildren}
          </ScrollView>) : (<View className={contentContainerClassName} style={{ flex: 1 }}>
            {animatedChildren}
          </View>)}
      </ZoomInPage>
    </SafeAreaView>);
}

export function SectionHeader({ title, subtitle, action }) {
    const { preferences } = useAppState();
    return (<View className="flex-row items-end justify-between gap-3">
      <View className="flex-1 gap-1">
        <Text className={`text-[18px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
        {subtitle ? <Text className={`text-[13px] leading-[18px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>);
}

export function HeroCard({ eyebrow, title, description, }) {
    const { preferences } = useAppState();
    return (<View className={`gap-2.5 rounded-[28px] border p-[22px] shadow-card ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
      <Text className="text-[12px] font-bold uppercase tracking-[1px] text-brand">{eyebrow}</Text>
      <Text className={`text-[28px] font-black leading-[34px] ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      <Text className={`text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{description}</Text>
    </View>);
}

export function Pill({ label, tone = palette.primary }) {
    return (<View className="self-start rounded-full px-3 py-[7px]" style={{ backgroundColor: `${tone}15` }}>
      <Text className="text-[12px] font-bold" style={{ color: tone }}>
        {label}
      </Text>
    </View>);
}

function getHierarchyOptionLabel(option) {
    if (option === null || option === undefined) {
        return '';
    }

    if (typeof option === 'string' || typeof option === 'number') {
        return String(option);
    }

    return String(option.label || option.name || option.title || option.text || option.id || '');
}

export function HierarchyFilterPanel({
    visible = true,
    categoryOptions = [],
    secondCategoryOptions = [],
    subCategoryOptions = [],
    selectedCategory = 'All',
    selectedSecondCategory = 'All',
    selectedSubCategory = 'All',
    onChangeCategory,
    onChangeSecondCategory,
    onChangeSubCategory,
}) {
    const { preferences } = useAppState();
    const [openField, setOpenField] = useState(null);

    if (!visible) {
        return null;
    }
    const fieldConfig = [
        {
            key: 'category',
            label: 'Category',
            value: selectedCategory,
            options: categoryOptions,
            onChange: onChangeCategory,
        },
        {
            key: 'secondcategory',
            label: 'Second',
            value: selectedSecondCategory,
            options: secondCategoryOptions,
            onChange: onChangeSecondCategory,
        },
        {
            key: 'subcategory',
            label: 'Subcategory',
            value: selectedSubCategory,
            options: subCategoryOptions,
            onChange: onChangeSubCategory,
        },
    ];

    const activeField = fieldConfig.find((field) => field.key === openField) || null;

    const getFieldDisplayValue = (field) => {
        const selectedOption = field.options.find((option) => String(option?.value ?? option?.id ?? option?.label ?? '') === String(field.value));
        return field.value && field.value !== 'All' ? selectedOption?.label || field.value : 'All';
    };

    const renderField = (field) => {
        const isOpen = activeField?.key === field.key;

        return (
            <View key={field.key} className="flex-1 gap-1">
                <Text className={`text-[10px] font-extrabold uppercase tracking-[0.8px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{field.label}</Text>
                <AnimatedPressable
                    className={`h-[42px] flex-row items-center justify-between rounded-[15px] border px-3 ${isOpen ? 'border-brand' : preferences.darkMode ? 'border-[#1a1a1a]' : 'border-[#e8dfda]'} ${preferences.darkMode ? 'bg-[#080808]' : 'bg-white'}`}
                    onPress={() => setOpenField(isOpen ? null : field.key)}
                >
                    <Text numberOfLines={1} className={`flex-1 pr-2 text-[12px] font-semibold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                        {getFieldDisplayValue(field)}
                    </Text>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={preferences.darkMode ? '#ffffff' : palette.muted}/>
                </AnimatedPressable>
            </View>
        );
    };

    const renderOptions = () => {
        if (!activeField) {
            return null;
        }

        const selected = String(activeField.value || 'All');

        return (
            <View className={`mt-2 overflow-hidden rounded-[16px] border ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-[#e8dfda] bg-white'}`}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-2 py-2">
                    {activeField.options.map((option, index) => {
                        const value = String(option?.value ?? option?.id ?? option?.label ?? '');
                        const label = getHierarchyOptionLabel(option);
                        const active = selected === value || selected === label || (selected === 'All' && value === 'All');

                        return (
                            <AnimatedPressable
                                key={`${activeField.key}-${value || index}`}
                                className={`min-w-[92px] items-center rounded-[13px] border px-3 py-2 ${active ? 'border-brand bg-brand' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#111111]' : 'border-[#f2ebe6] bg-[#fdfaf8]'}`}
                                onPress={() => {
                                    activeField.onChange?.(value || label || 'All');
                                    setOpenField(null);
                                }}
                            >
                                <Text numberOfLines={1} className={`text-[12px] font-semibold ${active ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-ink'}`}>
                                    {label || 'All'}
                                </Text>
                            </AnimatedPressable>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <View className="gap-2">
            <View className="flex-row gap-2">
                {fieldConfig.map(renderField)}
            </View>
            {renderOptions()}
        </View>
    );
}

export function InfoCard({ icon, title, subtitle, onPress, }) {
    const { preferences } = useAppState();
    const content = (<View className={`min-h-[140px] min-w-[47%] flex-1 gap-2.5 rounded-[24px] border p-[18px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#121212]' : 'bg-[#f8ece7]'}`}>
        <Ionicons name={icon} size={20} color={palette.primary}/>
      </View>
      <Text className={`text-[16px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      <Text className={`text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{subtitle}</Text>
    </View>);
    if (!onPress) {
        return content;
    }
    return <AnimatedPressable className="min-w-[47%] flex-1 rounded-[24px]" onPress={onPress}>{content}</AnimatedPressable>;
}

export function ListRow({ icon, title, value, onPress, }) {
    const { preferences } = useAppState();
    return (<AnimatedPressable className={`flex-row items-center justify-between gap-3 rounded-[20px] border px-4 py-[15px] ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} onPress={onPress}>
      <View className="flex-1 flex-row items-center gap-3">
        <View className={`h-[34px] w-[34px] items-center justify-center rounded-[12px] ${preferences.darkMode ? 'bg-[#121212]' : 'bg-[#f8ece7]'}`}>
          <Ionicons name={icon} size={18} color={palette.primary}/>
        </View>
        <Text className={`flex-1 text-[15px] font-bold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {value ? <Text className={`text-[12px] font-semibold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={palette.muted}/>
      </View>
    </AnimatedPressable>);
}

export function StatCard({ label, value, tone, }) {
    const { preferences } = useAppState();
    return (<View className={`flex-1 gap-2.5 rounded-[22px] border p-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
      <View className="h-[10px] w-[10px] rounded-full" style={{ backgroundColor: tone }}/>
      <Text className={`text-[24px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{value}</Text>
      <Text className={`text-[12px] font-semibold ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{label}</Text>
    </View>);
}

export function AnimatedPressable({ children, onPress, className, disabled, style, gradient, gradientColors = [palette.primary, palette.primaryDeep], }) {
    const scale = useRef(new Animated.Value(1)).current;
    const shouldUseGradient = gradient ?? className?.includes('bg-brand');
    const gradientProps = Platform.OS === 'web'
        ? { style: [StyleSheet.absoluteFillObject, { pointerEvents: 'none' }] }
        : { style: StyleSheet.absoluteFillObject, pointerEvents: 'none' };
    const animateTo = (value) => {
        Animated.spring(scale, {
            toValue: value,
            useNativeDriver: true,
            speed: 28,
            bounciness: 4,
        }).start();
    };
    return (<Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable className={`${className || ''} ${shouldUseGradient ? 'overflow-hidden' : ''}`} disabled={disabled} onPress={onPress} onPressIn={() => animateTo(0.97)} onPressOut={() => animateTo(1)} style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.96 : 1 })}>
        {shouldUseGradient ? <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} {...gradientProps}/> : null}
        {children}
      </Pressable>
    </Animated.View>);
}

export function LockedDetailOverlay({ title = 'Unlock', subtitle = 'Subscribe to more', onPress }) {
    const { preferences } = useAppState();
    return (<View className="absolute inset-0 items-center justify-center px-5" style={{ backgroundColor: preferences.darkMode ? 'rgba(0, 0, 0, 0.72)' : 'rgba(34, 11, 52, 0.28)' }}>
      <View className={`w-full max-w-[340px] items-center rounded-[28px] border px-6 py-7 shadow-card ${preferences.darkMode ? 'border-[#1f1f1f] bg-[#080808]' : 'border-white/55 bg-white/94'}`}>
        <View className={`absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full ${preferences.darkMode ? 'bg-[#121212]' : 'bg-[#f8e8d8]'}`}>
          <Ionicons name="lock-closed" size={18} color={palette.primary}/>
        </View>
        <View className="h-[68px] w-[68px] items-center justify-center rounded-[22px]" style={{ backgroundColor: `${palette.primary}14` }}>
          <Ionicons name="lock-closed" size={30} color={palette.primary}/>
        </View>
        <Text className={`mt-4 text-[24px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
        <Text className={`mt-1 text-center text-[13px] leading-5 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{subtitle}</Text>
        <AnimatedPressable className="mt-5 w-full rounded-[18px] bg-brand py-3.5" onPress={onPress}>
          <Text className="text-center text-[14px] font-extrabold text-white">Unlock Now</Text>
        </AnimatedPressable>
      </View>
    </View>);
}

export function UnlockBottomSheet({ title = 'Unlock More', subtitle = 'Subscribe to more', onClose, onPress, dismissible = true }) {
    const { preferences } = useAppState();
    const handleClose = dismissible ? onClose : undefined;
    return (<Modal animationType="fade" transparent visible onRequestClose={dismissible ? handleClose : () => {}}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" onPress={handleClose} disabled={!dismissible}>
          <View className={`absolute inset-0 ${preferences.darkMode ? 'bg-black/75' : 'bg-[#140b18]/45'}`}/>
          <View className={`absolute inset-0 ${preferences.darkMode ? 'bg-black/10' : 'bg-white/10'}`}/>
        </Pressable>

        <View className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <View className={`overflow-hidden rounded-[34px] border shadow-card ${preferences.darkMode ? 'border-[#1f1f1f] bg-[#080808]' : 'border-white/70 bg-white'}`} style={{
            shadowColor: '#ffffff',
            shadowOpacity: 0.28,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
            elevation: 18,
          }}>
            <View className="absolute inset-x-0 top-0 h-20 bg-brand"/>
            <View className="px-6 pb-8 pt-4">
              <View className="mb-8 items-center">
                <View className={`h-1 w-16 rounded-full ${preferences.darkMode ? 'bg-[#2b2b2b]' : 'bg-[#e8d7d3]'}`}/>
              </View>

              <View className="mb-4 flex-row justify-end">
                {dismissible ? (<Pressable className={`h-10 w-10 items-center justify-center rounded-full ${preferences.darkMode ? 'bg-[#121212]' : 'bg-[#f9f1ee]'}`} onPress={onClose}>
                  <Ionicons name="close" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
                </Pressable>) : null}
              </View>

              <View className="items-center">
                <View className={`h-[76px] w-[76px] items-center justify-center rounded-[24px] border ${preferences.darkMode ? 'border-[#1f1f1f] bg-[#121212]' : 'border-[#ffd8df] bg-[#fff5f7]'}`}>
                  <Ionicons name="lock-closed" size={34} color={palette.primary}/>
                </View>
                <Text className={`mt-5 text-center text-[26px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
                <Text className={`mt-2 px-3 text-center text-[14px] leading-6 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{subtitle}</Text>
                <AnimatedPressable className="mt-7 w-full rounded-[20px] bg-brand py-4" onPress={onPress}>
                  <Text className="text-center px-2 text-[15px] font-extrabold text-white">View Plans & Unlock</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>);
}
