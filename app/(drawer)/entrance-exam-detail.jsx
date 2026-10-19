import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useAppState } from '../../src/app-state';
import { palette } from '../../src/careermap-data';
import { getEntranceExams } from '../../src/api/entranceExamApi';
import { AnimatedPressable, Screen } from '../../src/careermap-ui';

function DetailCard({ title, children }) {
    const { preferences } = useAppState();

    return (
        <View
            className={`rounded-[24px] border px-4 py-4 ${preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'bg-card'}`}
            style={{
                borderColor: preferences.darkMode ? '#1a1a1a' : '#e8dfda',
                shadowColor: '#7c5f54',
                shadowOpacity: preferences.darkMode ? 0 : 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: preferences.darkMode ? 0 : 3,
            }}
        >
            <Text className="mb-3 text-[17px] font-extrabold text-brand">{title}</Text>
            {children}
        </View>
    );
}

export default function EntranceExamDetailScreen() {
    const { preferences } = useAppState();
    const { examId } = useLocalSearchParams();
    const { width: screenWidth } = useWindowDimensions();
    const [entranceExams, setEntranceExams] = useState([]);

    useEffect(() => {
        let isMounted = true;

        async function loadEntranceExams() {
            try {
                const items = await getEntranceExams();

                if (isMounted) {
                    setEntranceExams(items);
                }
            } catch (_error) {
                if (isMounted) {
                    setEntranceExams([]);
                }
            }
        }

        loadEntranceExams();

        return () => {
            isMounted = false;
        };
    }, []);

    const exam = entranceExams.find((item) => item.id === String(examId)) ?? entranceExams[0];

    if (!exam) {
        return (
            <Screen>
                <Text className={`text-[14px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Loading exam details...</Text>
            </Screen>
        );
    }

    return (
        <Screen contentContainerClassName="gap-[18px] px-5 py-5 pb-8">
            <View className="mb-7 flex-row items-center gap-3">
                <AnimatedPressable
                    onPress={() => (router.canGoBack() ? router.back() : router.push('/(drawer)/entrance-exam'))}
                    className={`h-10 w-10 items-center justify-center rounded-full ${preferences.darkMode ? 'bg-[#111111]' : 'bg-white'}`}
                    style={{
                        shadowColor: '#967c75',
                        shadowOpacity: preferences.darkMode ? 0 : 0.12,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: preferences.darkMode ? 0 : 2,
                    }}
                >
                    <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
                </AnimatedPressable>
                <Text className={`text-[22px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{exam.name}</Text>
            </View>

            <View className="items-center pb-4">
                <View className={`mb-4 h-[84px] w-[84px] items-center justify-center rounded-[26px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-[#ffecef]'}`}>
                    <Ionicons name="document-text-outline" size={34} color={palette.primary}/>
                </View>
                <Text className={`text-center text-[32px] font-black ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{exam.name}</Text>
                <Text className={`mt-1 text-[18px] font-medium ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{exam.mode}</Text>

                <View className="mt-4 flex-row gap-2">
                    <View className="rounded-full bg-[#fff1e8] px-3 py-1.5">
                        <Text className="text-[11px] font-bold text-[#ea872e]">Issue: {exam.issueDate}</Text>
                    </View>
                    <View className="rounded-full bg-[#e4f7ed] px-3 py-1.5">
                        <Text className="text-[11px] font-bold text-[#2f9367]">Last: {exam.lastDate}</Text>
                    </View>
                </View>
            </View>

            <View className="gap-4">
                <DetailCard title="">
                    {exam.aboutHtml ? (
                        <RenderHTML
                            contentWidth={screenWidth - 40}
                            source={{ html: exam.aboutHtml }}
                            baseStyle={{
                                color: preferences.darkMode ? '#b7aeb9' : palette.muted,
                                fontSize: 14,
                                lineHeight: 22,
                            }}
                            tagsStyles={{
                                h1: { fontSize: 20, fontWeight: '900', color: palette.primary, marginVertical: 8 },
                                h2: { fontSize: 18, fontWeight: '900', color: palette.primary, marginVertical: 8 },
                                h3: { fontSize: 16, fontWeight: '800', color: palette.primary, marginVertical: 6 },
                                h4: { fontSize: 15, fontWeight: '800', color: palette.primary, marginVertical: 6 },
                                h5: { fontSize: 14, fontWeight: '800', color: palette.primary, marginVertical: 5 },
                                h6: { fontSize: 13, fontWeight: '800', color: palette.primary, marginVertical: 5 },
                                p: { marginVertical: 4 },
                                li: { marginVertical: 3 },
                                ul: { marginVertical: 6, paddingLeft: 18 },
                                ol: { marginVertical: 6, paddingLeft: 18 },
                                table: { marginVertical: 8 },
                                th: { padding: 6, borderWidth: 1, borderColor: preferences.darkMode ? '#1a1a1a' : '#e8dfda', backgroundColor: preferences.darkMode ? '#111111' : '#f7f1ed' },
                                td: { padding: 6, borderWidth: 1, borderColor: preferences.darkMode ? '#1a1a1a' : '#e8dfda' },
                                strong: { fontWeight: '800' },
                                a: { color: palette.primary },
                            }}
                        />
                    ) : (
                        <Text className={`text-[14px] leading-6 ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
                            {exam.about || 'Description not available.'}
                        </Text>
                    )}
                </DetailCard>




                <AnimatedPressable
                    onPress={() => {
                        if (exam.website && exam.website !== '#') {
                            WebBrowser.openBrowserAsync(exam.website);
                        }
                    }}
                    className="mt-1 rounded-[18px] px-5 py-4"
                    style={{
                        backgroundColor: palette.primary,
                        shadowColor: '#711628',
                        shadowOpacity: 0.22,
                        shadowRadius: 16,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: 4,
                    }}
                >
                    <View className="flex-row items-center justify-center gap-2">
                        <Ionicons name="open-outline" size={18} color="#ffffff"/>
                        <Text className="text-[18px] font-extrabold text-white">Visit Official Website</Text>
                    </View>
                </AnimatedPressable>
            </View>
        </Screen>
    );
}
