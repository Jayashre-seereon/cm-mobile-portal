import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useAppState } from '../src/app-state';
import { palette, studyAbroadCountries } from '../src/careermap-data';
import { AnimatedPressable, Pill, Screen, SectionHeader } from '../src/careermap-ui';
export default function AbroadScreen() {
    const { isUnlocked } = useAppState();
    const unlocked = isUnlocked('abroad-consultancy');
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [detailTimer, setDetailTimer] = useState(10);
    const [detailLocked, setDetailLocked] = useState(false);
    const [preferredCountry, setPreferredCountry] = useState('');
    const [courseInterest, setCourseInterest] = useState('');
    const [budgetRange, setBudgetRange] = useState('');
    const [preferredIntake, setPreferredIntake] = useState('');
    useEffect(() => {
        if (selected === null || unlocked || detailLocked)
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
    }, [selected, unlocked, detailLocked]);
    if (submitted) {
        return (<Screen>
        <SectionHeader title="Request Sent" subtitle="Consultation request state added to match the prototype flow." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => {
                    setSubmitted(false);
                    setShowForm(false);
                    setPreferredCountry('');
                    setCourseInterest('');
                    setBudgetRange('');
                    setPreferredIntake('');
                }}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>
        <View className="gap-3 rounded-[26px] border border-line bg-card p-[22px]">
          <Text className="text-[24px] font-black text-ink">Our team will contact you shortly</Text>
          <Text className="text-[14px] leading-[22px] text-muted">
            Your study abroad consultation request has been recorded. We will help you shortlist countries, courses, and scholarship options.
          </Text>
          <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => {
                setSubmitted(false);
                setShowForm(false);
                setPreferredCountry('');
                setCourseInterest('');
                setBudgetRange('');
                setPreferredIntake('');
            }}>
            <Text className="text-center text-[14px] font-extrabold text-white">Done</Text>
          </AnimatedPressable>
        </View>
      </Screen>);
    }
    if (showForm) {
        return (<Screen>
        <SectionHeader title="Consultation Form" subtitle="A lightweight consultancy form matching the prototype structure." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => setShowForm(false)}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>
        <View className="gap-[14px] rounded-[24px] border border-line bg-card p-[18px]">
          {[
                ['Preferred Country', preferredCountry, setPreferredCountry, 'e.g. USA, UK, Canada'],
                ['Course Interest', courseInterest, setCourseInterest, 'e.g. MS in Computer Science'],
                ['Budget Range', budgetRange, setBudgetRange, 'e.g. 20-30 LPA'],
                ['Preferred Intake', preferredIntake, setPreferredIntake, 'e.g. Fall 2025'],
            ].map(([label, value, setter, placeholder]) => (<View key={label} className="gap-1.5">
              <Text className="text-[12px] font-extrabold text-muted">{label}</Text>
              <TextInput value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={palette.muted} className="rounded-[16px] border border-line bg-surface px-4 py-[14px] text-[13px] text-ink"/>
            </View>))}
          <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => (unlocked ? setSubmitted(true) : router.push('/subscription'))}>
            <Text className="text-center text-[14px] font-extrabold text-white">{unlocked ? 'Submit Request' : 'Subscribe to Submit'}</Text>
          </AnimatedPressable>
        </View>
      </Screen>);
    }
    if (selected !== null) {
        const country = studyAbroadCountries[selected];
        return (<Screen>
        <SectionHeader title={country.name} subtitle="Expanded country detail page adapted from the reference prototype." action={<Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#f2ebe6]" onPress={() => {
                    setSelected(null);
                    setDetailTimer(10);
                    setDetailLocked(false);
                }}>
              <Ionicons name="arrow-back" size={18} color={palette.text}/>
            </Pressable>}/>
        {!unlocked && !detailLocked ? (<View className="self-start rounded-full px-3 py-2" style={{ backgroundColor: `${palette.orange}12` }}>
            <Text className="text-[11px] font-extrabold" style={{ color: palette.orange }}>{detailTimer}s preview</Text>
          </View>) : null}
        {detailLocked ? (<View className="gap-3 rounded-[26px] border border-line bg-card p-[22px]">
            <Text className="text-[24px] font-black text-ink">Preview Time Expired</Text>
            <Text className="text-[14px] leading-[22px] text-muted">Subscribe to access full country details and guidance.</Text>
            <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => router.push('/subscription')}>
              <Text className="text-center text-[14px] font-extrabold text-white">View Plans</Text>
            </AnimatedPressable>
          </View>) : (<>
            <View className="items-center gap-2 py-1.5">
              <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px]" style={{ backgroundColor: `${palette.primary}10` }}>
                <Text className="text-[18px] font-black text-brand">{country.flag}</Text>
              </View>
              <Text className="text-center text-[24px] font-black text-ink">{country.name}</Text>
              <Text className="text-center text-[13px] leading-5 text-muted">{country.description}</Text>
            </View>

            <View className="gap-3 rounded-[26px] border border-line bg-card p-[22px]">
              <Text className="text-[15px] font-extrabold text-brand">Overview</Text>
              <Text className="text-[14px] leading-[22px] text-muted">{country.detail}</Text>
              <View className="flex-row gap-2.5">
                <View className="flex-1 gap-1 rounded-[18px] bg-[#f8f4ff] p-4">
                  <Ionicons name="cash-outline" size={18} color={palette.green}/>
                  <Text className="text-[12px] text-muted">Tuition</Text>
                  <Text className="text-[16px] font-extrabold" style={{ color: palette.purple }}>{country.tuition}</Text>
                </View>
                <View className="flex-1 gap-1 rounded-[18px] bg-[#f8f4ff] p-4">
                  <Ionicons name="school-outline" size={18} color={palette.blue}/>
                  <Text className="text-[12px] text-muted">Living Cost</Text>
                  <Text className="text-[16px] font-extrabold" style={{ color: palette.purple }}>{country.living}</Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Pill label={country.visa} tone={palette.blue}/>
                <Pill label={country.intake} tone={palette.green}/>
              </View>
            </View>

            {[
                    ['Visa & Work Rights', [`Visa: ${country.visa}`, `Intakes: ${country.intake}`, `Work: ${country.workRights}`]],
                    ['Top Universities', country.topUniversities.map((item) => `- ${item}`)],
                    ['Scholarships', country.scholarships.map((item) => `- ${item}`)],
                    ['Requirements', country.requirements.map((item) => `- ${item}`)],
                ].map(([title, lines]) => (<View key={title} className="gap-2.5 rounded-[26px] border border-line bg-card p-[22px]">
                <Text className="text-[15px] font-extrabold text-brand">{title}</Text>
                {lines.map((line) => (<Text key={line} className="text-[13px] leading-5 text-muted">{line}</Text>))}
              </View>))}

            <View className="gap-2.5 rounded-[26px] border border-line bg-card p-[22px]">
              <Text className="text-[15px] font-extrabold text-brand">Popular Courses</Text>
              <View className="flex-row flex-wrap gap-2">
                {country.popularCourses.map((course) => (<Pill key={course} label={course} tone={palette.primary}/>))}
              </View>
            </View>

            <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => {
                    setPreferredCountry(country.name);
                    setShowForm(true);
                }}>
              <Text className="text-center text-[14px] font-extrabold text-white">Consult Now</Text>
            </AnimatedPressable>
          </>)}
      </Screen>);
    }
    return (<Screen>
      <SectionHeader title="Study Abroad" subtitle="Country list and consultancy flow adapted from the prototype."/>
      <View className="items-center gap-2 rounded-[26px] border border-line bg-card p-5">
        <View className="h-[60px] w-[60px] items-center justify-center rounded-[20px]" style={{ backgroundColor: `${palette.teal}12` }}>
          <Ionicons name="globe-outline" size={28} color={palette.teal}/>
        </View>
        <Text className="text-[22px] font-black text-ink">Study Abroad</Text>
        <Text className="text-center text-[13px] leading-5 text-muted">Explore top destinations, compare tuition and living cost, and request counselling from the same flow as the git prototype.</Text>
      </View>
      <View className="gap-3">
        {studyAbroadCountries.map((country, index) => (<Pressable key={country.name} className="gap-1.5 rounded-[22px] border border-line bg-card p-[18px]" onPress={() => {
                setSelected(index);
                setDetailTimer(10);
                setDetailLocked(false);
            }}>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: `${palette.primary}10` }}>
                <Text className="text-[11px] font-black text-brand">{country.flag}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-[16px] font-extrabold text-ink">{country.name}</Text>
                <Text className="text-[13px] leading-5 text-muted">{country.description}</Text>
                <Text className="text-[12px] font-extrabold text-brand">{country.tuition}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted}/>
            </View>
          </Pressable>))}
      </View>
      <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => setShowForm(true)}>
        <Text className="text-center text-[14px] font-extrabold text-white">Consult Now</Text>
      </AnimatedPressable>
    </Screen>);
}
