import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useAppState } from '../src/app-state';
import { palette, scholarships } from '../src/careermap-data';
import { Pill, Screen, SectionHeader } from '../src/careermap-ui';
export default function ScholarshipScreen() {
    const { isUnlocked } = useAppState();
    const scholarshipUnlocked = isUnlocked('scholarship');
    const [showFilters, setShowFilters] = useState(false);
    const [activeStatus, setActiveStatus] = useState('All');
    const [sortBy, setSortBy] = useState('Default');
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [detailTimer, setDetailTimer] = useState(10);
    const [detailLocked, setDetailLocked] = useState(false);
    let filtered = activeStatus === 'All' ? [...scholarships] : scholarships.filter((item) => item.status === activeStatus);
    if (sortBy === 'A-Z')
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Z-A')
        filtered.sort((a, b) => b.name.localeCompare(a.name));
    useEffect(() => {
        if (selectedIndex === null || scholarshipUnlocked || detailLocked)
            return;
        const timer = setInterval(() => {
            setDetailTimer((value) => {
                if (value <= 1) {
                    clearInterval(timer);
                    setDetailLocked(true);
                    return 0;
                }
                return value - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [selectedIndex, scholarshipUnlocked, detailLocked]);
    if (selectedIndex !== null) {
        const item = scholarships[selectedIndex];
        return (<Screen>
        <SectionHeader title={item.name} subtitle="Scholarship detail page closely matching the reference structure." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => {
                    setSelectedIndex(null);
                    setDetailTimer(10);
                    setDetailLocked(false);
                }}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>

        {!scholarshipUnlocked && !detailLocked ? (<View className="self-start rounded-full bg-[#f2ebe6] px-3 py-2">
            <Text className="text-[12px] font-extrabold text-brand">{detailTimer}s preview</Text>
          </View>) : null}

        {detailLocked ? (<View className="items-center gap-3 rounded-[24px] border border-line bg-card p-6">
            <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-brand">
              <Ionicons name="lock-closed-outline" size={28} color="#fff"/>
            </View>
            <Text className="text-center text-[20px] font-black text-ink">Preview Time Expired</Text>
            <Text className="text-center text-[14px] leading-[22px] text-muted">Subscribe to access full scholarship details, requirements, and application links.</Text>
            <Pressable className="w-full rounded-[16px] bg-brand py-[14px]" onPress={() => router.push('/subscription')}>
              <Text className="text-center text-[14px] font-extrabold text-white">View Plans</Text>
            </Pressable>
          </View>) : (<>
            <View className="items-center gap-2 py-2">
              <View className="h-[68px] w-[68px] items-center justify-center rounded-[22px]" style={{ backgroundColor: `${palette.green}14` }}>
                <Ionicons name="ribbon-outline" size={28} color={palette.green}/>
              </View>
              <Text className="text-center text-[22px] font-black text-ink">{item.name}</Text>
              <Text className="text-center text-[13px] text-muted">by {item.provider}</Text>
              <View className="flex-row flex-wrap justify-center gap-2">
                <Pill label={item.status} tone={item.status === 'Active' ? palette.green : item.status === 'Expired' ? palette.danger : palette.orange}/>
                <Pill label={item.tag} tone={palette.primary}/>
              </View>
            </View>

            <View className="gap-3 rounded-[22px] border border-line bg-card p-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-[13px] text-muted">Amount</Text>
                <Text className="text-[20px] font-black text-success">{item.amount}</Text>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-[13px] text-muted">Deadline</Text>
                <Text className="text-[13px] font-bold text-ink">{item.deadline}</Text>
              </View>
              <View className="flex-row items-start justify-between gap-3">
                <Text className="text-[13px] text-muted">Eligibility</Text>
                <Text className="max-w-[65%] text-right text-[13px] font-bold text-ink">{item.eligibility}</Text>
              </View>
            </View>

            <View className="gap-2.5 rounded-[22px] border border-line bg-card p-4">
              <Text className="text-[14px] font-extrabold text-brand">About This Scholarship</Text>
              <Text className="text-[13px] leading-[21px] text-muted">{item.description}</Text>
            </View>

            <View className="gap-2.5 rounded-[22px] border border-line bg-card p-4">
              <Text className="text-[14px] font-extrabold text-brand">Requirements</Text>
              {item.requirements.map((requirement) => (<View key={requirement} className="flex-row items-center gap-2.5">
                  <View className="h-2 w-2 rounded-full bg-brand"/>
                  <Text className="flex-1 text-[13px] leading-5 text-muted">{requirement}</Text>
                </View>))}
            </View>

            <Pressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => Linking.openURL(item.link)}>
              <Text className="text-center text-[14px] font-extrabold text-white">Apply Now</Text>
            </Pressable>
          </>)}
      </Screen>);
    }
    return (<Screen>
      <SectionHeader title="Scholarships" subtitle="Scholarship directory with filters and drill-down cards adapted from the prototype." action={<Pressable className={`h-[40px] w-[40px] items-center justify-center rounded-[12px] ${showFilters ? 'bg-brand' : 'bg-[#f2ebe6]'}`} onPress={() => setShowFilters((value) => !value)}>
            <Ionicons name={showFilters ? 'options' : 'options-outline'} size={18} color={showFilters ? '#ffffff' : palette.text}/>
          </Pressable>}/>

      <View className="flex-row gap-3 rounded-[22px] border border-line bg-card p-4">
        <View className="h-12 w-12 items-center justify-center rounded-[16px]" style={{ backgroundColor: `${palette.green}14` }}>
          <Ionicons name="ribbon-outline" size={24} color={palette.green}/>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-[16px] font-extrabold text-ink">Scholarships & Funding</Text>
          <Text className="text-[13px] leading-5 text-muted">Explore active opportunities, compare deadlines, and unlock full details like the reference prototype.</Text>
        </View>
      </View>

      {showFilters ? (<View className="gap-2.5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-1">
            {['All', 'Active', 'Expired', 'Due Date Expired', 'Closed'].map((label) => (<Pressable key={label} className={`rounded-full px-3 py-2 ${activeStatus === label ? 'bg-brand' : 'bg-[#f2ebe6]'}`} onPress={() => setActiveStatus(label)}>
                <Text className={`text-[11px] font-extrabold ${activeStatus === label ? 'text-white' : 'text-ink'}`}>{label}</Text>
              </Pressable>))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-1">
            {['Default', 'A-Z', 'Z-A'].map((label) => (<Pressable key={label} className={`rounded-full px-3 py-2 ${sortBy === label ? 'bg-brand' : 'bg-[#f2ebe6]'}`} onPress={() => setSortBy(label)}>
                <Text className={`text-[11px] font-extrabold ${sortBy === label ? 'text-white' : 'text-ink'}`}>{label}</Text>
              </Pressable>))}
          </ScrollView>
        </View>) : null}

      <View className="gap-3">
        {filtered.slice(0, scholarshipUnlocked ? filtered.length : 6).map((item) => (<Pressable key={item.name} className="gap-3 rounded-[22px] border border-line bg-card p-4" onPress={() => {
                setSelectedIndex(scholarships.indexOf(item));
                setDetailTimer(10);
                setDetailLocked(false);
            }}>
            <View className="flex-row gap-3">
              <View className="h-[50px] w-[50px] items-center justify-center rounded-[16px]" style={{ backgroundColor: `${palette.green}14` }}>
                <Ionicons name="ribbon-outline" size={20} color={palette.green}/>
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-[15px] font-extrabold text-ink">{item.name}</Text>
                    <Text className="text-[12px] text-muted">{item.provider}</Text>
                  </View>
                  <Pill label={item.status} tone={item.status === 'Active' ? palette.green : item.status === 'Expired' ? palette.danger : palette.orange}/>
                </View>
                <Text className="text-[12px] text-muted">{item.eligibility}</Text>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-[16px] font-black text-success">{item.amount}</Text>
                  <Text className="text-[12px] text-muted">{item.deadline}</Text>
                </View>
              </View>
            </View>
            <Pill label={item.tag} tone={palette.primary}/>
          </Pressable>))}
      </View>

      {!scholarshipUnlocked && filtered.length > 4 ? (<View className="gap-2 rounded-[22px] border border-line bg-card p-4">
          <Text className="text-[16px] font-extrabold text-ink">Subscribe to See More</Text>
          <Text className="text-[13px] leading-5 text-muted">More scholarship listings and full application details stay locked until subscription.</Text>
          <Pressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => router.push('/subscription')}>
            <Text className="text-center text-[14px] font-extrabold text-white">Subscribe to More</Text>
          </Pressable>
        </View>) : null}
    </Screen>);
}
