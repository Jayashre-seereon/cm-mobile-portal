import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useAppState } from '../src/app-state';
import { AnimatedPressable, Pill, Screen, SectionHeader } from '../src/careermap-ui';
import { featuredInstitutes, featuredMentors, featuredScholarships, moduleCards, palette, studentProfile } from '../src/careermap-data';
const getInstituteInitials = (name) => {
    const source = String(name || 'Institute').trim();
    const initials = source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return initials || 'I';
};
const renderInstituteLogo = (item, size = 52) => {
    if (item?.logo) {
        return (<Image source={{ uri: item.logo }} resizeMode="cover" style={{
                width: size,
                height: size,
                borderRadius: 18,
            }}/>);
    }

    return (<View className="items-center justify-center" style={{
            width: size,
            height: size,
            borderRadius: 18,
            backgroundColor: `${palette.blue}14`,
            borderWidth: 1,
            borderColor: `${palette.blue}18`,
        }}>
      <Text className="text-[16px] font-black" style={{ color: palette.blue, lineHeight: 20 }}>
        {getInstituteInitials(item?.name)}
      </Text>
    </View>);
};
const personalityQuestions = [
    { q: 'When faced with a problem, I prefer to:', options: ['Analyze data systematically', 'Brainstorm creative solutions', 'Discuss with others', 'Act quickly on instinct'] },
    { q: 'In my free time, I enjoy:', options: ['Reading or researching', 'Creating art or music', 'Socializing with friends', 'Physical activities or sports'] },
    { q: 'I work best when:', options: ['I have a clear plan', 'I can be spontaneous', 'I collaborate with a team', 'I work independently'] },
    { q: 'I am most motivated by:', options: ['Achieving goals', 'Expressing myself', 'Helping others', 'Learning new skills'] },
    { q: 'My ideal workspace is:', options: ['Organized and quiet', 'Colorful and inspiring', 'Open and collaborative', 'Flexible and mobile'] },
    { q: 'When making decisions, I rely on:', options: ['Logic and facts', 'Intuition and feelings', 'Advice from others', 'Past experiences'] },
];
const personalityTypes = [
    { type: 'The Analytical Thinker', desc: 'You thrive in structured environments and enjoy solving complex problems with logic and clarity.', careers: ['Engineering', 'Data Science', 'Finance', 'Research'] },
    { type: 'The Creative Visionary', desc: 'You bring imagination, originality, and expressive thinking to everything you work on.', careers: ['Design', 'Architecture', 'Media', 'Marketing'] },
    { type: 'The Empathetic Helper', desc: 'You naturally connect with people and do well in roles built around support, care, and communication.', careers: ['Psychology', 'Teaching', 'Medicine', 'HR'] },
    { type: 'The Dynamic Explorer', desc: 'You enjoy variety, energy, and fast-moving environments where action leads the way.', careers: ['Business', 'Travel', 'Sports', 'Entrepreneurship'] },
];
export default function HomeScreen() {
    const [showPersonalityTest, setShowPersonalityTest] = useState(false);
    const [completedPersonality, setCompletedPersonality] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState(Array(personalityQuestions.length).fill(null));
    const { isUnlocked, onboarding, userProfile } = useAppState();
    const personalityResult = useMemo(() => {
        const counts = [0, 0, 0, 0];
        answers.forEach((answer) => {
            if (answer !== null)
                counts[answer] += 1;
        });
        return personalityTypes[counts.indexOf(Math.max(...counts))];
    }, [answers]);
    const resetPersonality = () => {
        setShowPersonalityTest(false);
        setCompletedPersonality(false);
        setCurrentQuestion(0);
    };
    if (showPersonalityTest && !completedPersonality) {
        const current = personalityQuestions[currentQuestion];
        return (<Screen>
        <View className="flex-row items-center gap-3">
          <Pressable className="h-[38px] w-[38px] items-center justify-center rounded-[12px] border border-line bg-card" onPress={resetPersonality}>
            <Ionicons name="chevron-back" size={18} color={palette.text}/>
          </Pressable>
          <Text className="text-[18px] font-black text-ink"> Personality</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8e2de]">
            <View className="h-full rounded-full bg-brand" style={{ width: `${((currentQuestion + 1) / personalityQuestions.length) * 100}%` }}/>
          </View>
          <Text className="text-[12px] font-extrabold text-muted">{currentQuestion + 1}/{personalityQuestions.length}</Text>
        </View>

        <View className="gap-2 rounded-[24px] border border-line bg-card p-5">
          <Text className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-muted">Question {currentQuestion + 1}</Text>
          <Text className="text-[18px] font-extrabold leading-[26px] text-ink">{current.q}</Text>
        </View>

        <View className="gap-3">
          {current.options.map((option, index) => {
                const active = answers[currentQuestion] === index;
                return (<Pressable key={option} className={`rounded-[18px] border p-4 ${active ? 'border-brand bg-brand' : 'border-line bg-card'}`} onPress={() => {
                        const next = [...answers];
                        next[currentQuestion] = index;
                        setAnswers(next);
                    }}>
                <Text className={`text-[14px] font-bold ${active ? 'text-white' : 'text-ink'}`}>{String.fromCharCode(65 + index)}. {option}</Text>
              </Pressable>);
            })}
        </View>

        <View className="flex-row gap-3">
          <Pressable className="min-w-[112px] flex-1 items-center rounded-[16px] border border-line bg-card px-5 py-[14px]" disabled={currentQuestion === 0} onPress={() => setCurrentQuestion((value) => value - 1)} style={({ pressed }) => ({ opacity: currentQuestion === 0 || pressed ? 0.42 : 1 })}>
            <Text className={`text-[14px] font-extrabold ${currentQuestion === 0 ? 'text-muted' : 'text-ink'}`}>Previous</Text>
          </Pressable>
          <AnimatedPressable className="min-w-[112px] flex-1 items-center rounded-[16px] bg-brand px-5 py-[14px]" disabled={answers[currentQuestion] === null} onPress={() => currentQuestion < personalityQuestions.length - 1 ? setCurrentQuestion((value) => value + 1) : setCompletedPersonality(true)}>
            <Text className="text-[14px] font-extrabold text-white">{currentQuestion < personalityQuestions.length - 1 ? 'Next' : 'See Results'}</Text>
          </AnimatedPressable>
        </View>
      </Screen>);
    }
    if (showPersonalityTest && completedPersonality) {
        return (<Screen>
        <View className="items-center gap-[14px]">
          <Text className="text-[28px] font-black text-brand">Spark</Text>
          <Text className="text-center text-[28px] font-black text-ink">Your Personality</Text>
          <View className="rounded-[18px] px-[18px] py-[10px]" style={{ backgroundColor: `${palette.primary}12` }}>
            <Text className="text-[18px] font-black text-brand">{personalityResult.type}</Text>
          </View>
          <Text className="text-center text-[14px] leading-[22px] text-muted">{personalityResult.desc}</Text>

          <View className="w-full gap-2.5 rounded-[24px] border border-line bg-card p-[18px]">
            <Text className="text-[16px] font-extrabold text-ink">Recommended Careers</Text>
            <View className="flex-row flex-wrap gap-2">
              {personalityResult.careers.map((career) => (<Pill key={career} label={career} tone={palette.primary}/>))}
            </View>
          </View>

          <View className="w-full gap-2.5 rounded-[24px] border border-line bg-card p-[18px]">
            <Text className="text-[16px] font-extrabold text-ink">Get a Full Psychometric Analysis</Text>
            <Text className="text-[13px] leading-5 text-muted">Take the deeper assessment to unlock a richer career report with stronger recommendations.</Text>
            <AnimatedPressable className="rounded-[16px] bg-brand py-[14px]" onPress={() => router.push('/(drawer)/(tabs)/assessment')}>
              <Text className="text-center text-[14px] font-extrabold text-white">Take Full Psychometric Test</Text>
            </AnimatedPressable>
          </View>

          <Pressable className="w-full items-center rounded-[16px] border border-line bg-card py-[14px]" onPress={resetPersonality}>
            <Text className="text-[14px] font-extrabold text-ink">Back to Dashboard</Text>
          </Pressable>
        </View>
      </Screen>);
    }
    return (<Screen>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.primary}12` }}>
            <Text className="text-[20px] font-black text-brand">{(userProfile.name || onboarding.name || studentProfile.name).charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text className="text-[12px] text-muted">Good morning</Text>
            <Text className="text-[18px] font-black text-ink">{userProfile.name || onboarding.name || studentProfile.name}</Text>
          </View>
        </View>
        <Pressable className="h-[42px] w-[42px] items-center justify-center rounded-[16px] border border-line bg-card" onPress={() => router.push('/(drawer)/notifications')}>
          <Ionicons name="notifications-outline" size={20} color={palette.text}/>
        </Pressable>
      </View>

      <View className="overflow-hidden rounded-[28px] bg-brand p-[22px]">
        <View className="absolute bottom-[-34px] right-[-28px] h-[148px] w-[148px] rounded-full bg-white/10"/>
        <View className="absolute right-[18px] top-[18px]">
          <Text className="text-[28px] font-black text-white/15">Mind</Text>
        </View>
        <View className="gap-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sparkles" size={14} color="#f6ce63"/>
            <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-[#f6ce63]">Recommended</Text>
          </View>
          <Text className="text-[28px] font-black text-white">Know Your Personality</Text>
          <Text className="max-w-[80%] text-[13px] leading-5 text-white/80">
            {isUnlocked('psychometric-test')
            ? 'Take the comprehensive psychometric test to get detailed career insights and recommendations.'
            : 'Answer quick questions to discover your personality type and ideal career direction .'}
          </Text>
          <Pressable className="mt-1 self-start rounded-full bg-white px-4 py-2.5" onPress={() => router.push('/(drawer)/assessment-preview')}>
            <Text className="text-[13px] font-extrabold text-brand">Take Full Psychometric Test</Text>
          </Pressable>
        </View>
      </View>

      <SectionHeader title="Explore Modules"/>
      <View className="flex-row flex-wrap gap-2.5">
        {moduleCards.map((card) => (<Pressable key={card.title} style={{ width: '31%' }} onPress={() => router.push(card.route)}>
          <View className="min-h-[116px] items-center justify-center rounded-[20px] border bg-card pt-3 pb-2.5 px-1.5" style={{ borderColor: `${card.tone}30` }}>
            <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px]" style={{ backgroundColor: `${card.tone}14` }}>
              <Ionicons name={card.icon} size={20} color={card.tone}/>
            </View>
            <View className="h-[36px] w-full items-center justify-center mt-1">
              <Text numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 12.5, lineHeight: 16, textAlign: 'center' }} className="w-full font-extrabold text-ink">{card.title}</Text>
            </View>
          </View>
        </Pressable>))}
      </View>

      <SectionHeader title="Explore Your Mentors" action={<Pressable onPress={() => router.push('/(drawer)/book-mentor')}><Text className="text-[12px] font-extrabold text-brand">See all</Text></Pressable>}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2">
        {featuredMentors.map((mentor) => (<Pressable key={mentor.name} className="w-[164px] items-center gap-1.5 rounded-[22px] border border-line bg-card p-4" onPress={() => router.push('/(drawer)/book-mentor')}>
            <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px]" style={{ backgroundColor: `${mentor.accent}15` }}>
              <Ionicons name="person" size={22} color={mentor.accent}/>
            </View>
            <Text className="text-center text-[13px] font-extrabold text-ink">{mentor.name}</Text>
            <Text className="text-center text-[11px] font-bold text-brand">{mentor.specialty}</Text>
            <Text className="text-center text-[11px] text-muted">{mentor.rating} rating | {mentor.experience}</Text>
          </Pressable>))}
      </ScrollView>

      <SectionHeader title="Explore Scholarships" action={<Pressable onPress={() => router.push('/(drawer)/scholarship')}><Text className="text-[12px] font-extrabold text-brand">See all</Text></Pressable>}/>
      <View className="gap-3">
        {featuredScholarships.map((item) => (<Pressable key={item.name} className="flex-row items-center gap-3 rounded-[22px] border border-line bg-card p-4" onPress={() => router.push('/(drawer)/scholarship')}>
            <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-[#edf9f1]">
              <Ionicons name="ribbon-outline" size={20} color={palette.green}/>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-[14px] font-extrabold text-ink">{item.name}</Text>
              <Text className="text-[12px] font-bold text-success">{item.amount}</Text>
            </View>
            <View className="items-end gap-1">
              <Pill label={item.tag} tone={palette.primary}/>
              <Text className="text-[11px] text-muted">{item.deadline}</Text>
            </View>
          </Pressable>))}
      </View>

      <SectionHeader title="Explore Institutes" action={<Pressable onPress={() => router.push('/(drawer)/institute')}><Text className="text-[12px] font-extrabold text-brand">See all</Text></Pressable>}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2">
        {featuredInstitutes.map((item) => (<Pressable key={item.name} className="w-[164px] items-center gap-1.5 rounded-[22px] border border-line bg-card p-4" onPress={() => router.push('/(drawer)/institute')}>
            <View className="h-[52px] w-[52px] overflow-hidden rounded-[18px]" style={{ backgroundColor: `${palette.blue}14` }}>
              {renderInstituteLogo(item)}
            </View>
            <Text className="text-center text-[13px] font-extrabold text-ink">{item.name}</Text>
            <Text className="text-center text-[11px] font-bold text-brand">{item.location}</Text>
            <Text className="text-center text-[11px] text-muted">{item.type}</Text>
          </Pressable>))}
      </ScrollView>

      <View className="gap-2 rounded-[24px] border border-line bg-card p-[18px]">
        <Text className="text-[14px] font-black uppercase tracking-[0.5px] text-ink">Quick Actions</Text>
        {[
            { label: 'View Subscription Plans', path: '/(drawer)/subscription', icon: 'sparkles-outline', iconTone: palette.secondary },
            { label: 'Your Test History', path: '/(drawer)/(tabs)/profile', icon: 'time-outline', iconTone: palette.blue },
            { label: 'Saved Careers', path: '/(drawer)/(tabs)/library', icon: 'star-outline', iconTone: palette.orange },
        ].map((item) => (<Pressable key={item.label} className="flex-row items-center justify-between py-2" onPress={() => router.push(item.path)}>
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-[#f4eeea]">
                <Ionicons name={item.icon} size={17} color={item.iconTone}/>
              </View>
              <Text className="text-[14px] font-bold text-ink">{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted}/>
          </Pressable>))}
      </View>
    </Screen>);
}
