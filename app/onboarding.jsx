import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../src/app-state';
import { BeeMascot } from '../src/bee-mascot';
import { palette } from '../src/careermap-data';
import { AnimatedBackground } from '../src/animated-background';
import { AnimatedPressable } from '../src/careermap-ui';
import { useAuthStore } from '../src/store/auth-store';
const studentClassOptions = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Graduate', 'Post Graduate','Other'];
const streamOptions = ['Science', 'Commerce', 'Arts', 'Other'];
const interestOptions = ['Science & Tech', 'Problem Solving','Research & Discovery','Art & Literature','Business ','Sports','Creativity & Design','Dance & Music','Helping People','Public Speaking' ];
const clarityOptions = [
    'Clear on my goal, need the right path',
    'Choosing between a few options',
    "Confused between my choice and parents' expectations",
    'I keep changing my options',
    'I have limited awareness of options',
    'I have no idea what to do',
];
const strengthOptions = ['Analytical Thinking', 'Communication', 'Creativity', 'Leadership', 'Problem-solving','Teamwork','Time Management','Adaptability','Critical Thinking','Emotional Intelligence','Technical Skills','Decision Making'];
const priorityOptions = ['High Earning Potential ', 'Passion and Interest', 'Work-Life Balance', 'Job Security', 'Making a Positive Impact', 'Creative Freedom','Intellectual Growth & Advancement'];
export default function OnboardingScreen() {
    const { preferences, saveOnboarding } = useAppState();
    const setOnboardingData = useAuthStore((state) => state.setOnboardingData);
    const setPendingInstituteOnboarding = useAuthStore((state) => state.setPendingInstituteOnboarding);
    const hasAuthenticatedSession = useAuthStore((state) => state.hasAuthenticatedSession);
    const [userType, setUserType] = useState('');
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [childName, setChildName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStream, setSelectedStream] = useState('');
    const [otherClass, setOtherClass] = useState('');
    const [otherStream, setOtherStream] = useState('');
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedClarity, setSelectedClarity] = useState('');
    const [selectedStrengths, setSelectedStrengths] = useState([]);
    const [selectedPriorities, setSelectedPriorities] = useState([]);
    const [isOnboardingSaved, setIsOnboardingSaved] = useState(false);
    const stepOpacity = useRef(new Animated.Value(0)).current;
    const stepTranslate = useRef(new Animated.Value(34)).current;
    const totalSteps = 10;
    const progressCount = totalSteps - 2;
    useEffect(() => {
        stepOpacity.setValue(0);
        stepTranslate.setValue(34);
        Animated.parallel([
            Animated.timing(stepOpacity, {
                toValue: 1,
                duration: 320,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(stepTranslate, {
                toValue: 0,
                duration: 320,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();
    }, [step, stepOpacity, stepTranslate]);
    const toggleMulti = (value, selected, setSelected) => {
        setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    };
    const canProceed = () => {
        if (step === 0)
            return userType !== '';
        if (step === 2)
            return name.trim().length > 0  && gender !== '';
        if (step === 3)
            return userType === 'parent' ? childName.trim().length > 0 : selectedClass !== '' && (selectedClass !== 'Other' || otherClass.trim().length > 0);
        if (step === 4)
            return userType === 'parent'
                ? selectedClass !== '' && (selectedClass !== 'Other' || otherClass.trim().length > 0)
                : selectedStream !== '' && (selectedStream !== 'Other' || otherStream.trim().length > 0);
        if (step === 5)
            return userType === 'parent'
                ? selectedStream !== '' && (selectedStream !== 'Other' || otherStream.trim().length > 0)
                : selectedInterests.length > 0;
      if (step === 6)
    return userType === 'parent'
        ? selectedPriorities.length > 0
        : selectedClarity !== '';

if (step === 7 && userType === 'student')
    return selectedStrengths.length > 0;

if (step === 8 && userType === 'student')
    return selectedPriorities.length > 0;
        return true;
    };
    const next = () => {

    // Parent Flow
    if (userType === 'parent') {

        // Stream -> Priority
        if (step === 5) {
            setStep(6);
            return;
        }

        // Priority -> Success
        if (step === 6) {
            const onboardingData = {
                userType,
                name,
                gender,
                childName,
                selectedClass: selectedClass === 'Other' ? otherClass.trim() : selectedClass,
                selectedStream: selectedStream === 'Other' ? otherStream.trim() : selectedStream,
                selectedPriorities,
                selectedGuidance: '',
            };

            saveOnboarding(onboardingData);
            setOnboardingData(onboardingData);
            setStep(9);
            return;
        }
    }

    // Student Flow
    if (step === 8) {
        const onboardingData = {
            userType,
            name,
            childName,
            selectedClass: selectedClass === 'Other' ? otherClass.trim() : selectedClass,
            selectedStream: selectedStream === 'Other' ? otherStream.trim() : selectedStream,
            selectedInterests,
            selectedClarity,
            selectedStrengths,
            selectedPriorities,
            selectedGuidance: '',
        };

        saveOnboarding(onboardingData);
        setOnboardingData(onboardingData);
        setStep(9);
        return;
    }

    if (step === 9) {
        setPendingInstituteOnboarding(false);
        router.replace(hasAuthenticatedSession ? '/(drawer)/(tabs)' : '/login');
        return;
    }

    setStep(step + 1);
};
    return (<SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}> 
         <AnimatedBackground /> 
          <ScrollView className="flex-1" contentContainerClassName="flex-grow gap-5 px-6 py-6" showsVerticalScrollIndicator={false}>
        <Pressable className={`h-10 w-10 items-center justify-center rounded-[14px] ${preferences.darkMode ? 'bg-[#111111]' : 'bg-surface'}`} onPress={() => {
            if (step > 0) {
                setStep((value) => value - 1);
                return;
            }
            router.back();
        }}>
          <Ionicons name="arrow-back" size={18} color={preferences.darkMode ? '#ffffff' : palette.text}/>
        </Pressable>
        {step > 0 && step < totalSteps - 1 ? (<View className="flex-row gap-1.5">
            {Array.from({ length: progressCount }).map((_, index) => (<View key={index} className={`h-1.5 flex-1 rounded-full ${index < step ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#e6e0dc]'}`}/>))}
          </View>) : null}

        <Animated.View style={{ opacity: stepOpacity, transform: [{ translateX: stepTranslate }] }}>
        {step === 0 ? (<View className="flex-grow items-center justify-center gap-4 py-7">
            <BeeMascot size={100} draggable={false}/>
            <Text className={`text-center text-[28px] font-black leading-9 ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>Choose Your Roadmap</Text>
            <Text className={`max-w-[300px] text-center text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Tell us who you are so we can personalize your experience</Text>
            <View className="w-full gap-4">
              <Pressable onPress={() => setUserType('student')} className={`flex-row items-center gap-4 rounded-[24px] border-2 p-[18px] ${userType === 'student' ? 'border-brand bg-[#fff1f4]' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <View className={`h-14 w-14 items-center justify-center rounded-[18px] ${userType === 'student' ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#eee8e5]'}`}>
                  <Text className={`text-[22px] font-black ${userType === 'student' ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-muted'}`}>S</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className={`text-[17px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>I&apos;m a Student</Text>
                  <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Explore career paths for myself</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => setUserType('parent')} className={`flex-row items-center gap-4 rounded-[24px] border-2 p-[18px] ${userType === 'parent' ? 'border-brand bg-[#fff1f4]' : preferences.darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`}>
                <View className={`h-14 w-14 items-center justify-center rounded-[18px] ${userType === 'parent' ? 'bg-brand' : preferences.darkMode ? 'bg-[#111111]' : 'bg-[#eee8e5]'}`}>
                  <Text className={`text-[22px] font-black ${userType === 'parent' ? 'text-white' : preferences.darkMode ? 'text-white' : 'text-muted'}`}>P</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className={`text-[17px] font-extrabold ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>I&apos;m a Parent</Text>
                  <Text className={`text-[12px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>Explore careers for my child</Text>
                </View>
              </Pressable>
            </View>
          </View>) : null}

        {step === 1 ? (<View className="flex-grow items-center justify-center gap-4 py-7">
            <BeeMascot size={100} draggable={false}/>
            <Text className={`text-center text-[28px] font-black leading-9 ${preferences.darkMode ? 'text-white' : 'text-ink'}`}>{userType === 'parent' ? 'Welcome, Parent!' : "Hi! I'm your Career Guide"}</Text>
            <Text className={`max-w-[300px] text-center text-[14px] leading-[22px] ${preferences.darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
              {userType === 'parent'
                ? "We'll help you explore career options for your child's future."
                : "I'll help you explore the best career path. Let's get started."}
            </Text>
          </View>) : null}

       {step === 2 ? (
  <>
    <StepInput
      darkMode={preferences.darkMode}
      title="What's your name?"
      icon="Name"
      value={name}
      setValue={setName}
      placeholder={userType === 'parent' ? 'Enter your name' : 'Enter your full name'}
    />

    {/* ✅ ADD THIS ONLY */}
    <View className="gap-2 mt-4">
      <Text
        className={`text-[18px] font-extrabold text-center ${
          preferences.darkMode ? 'text-white' : 'text-ink'
        }`}
      >
        Select Gender
      </Text>

      <View className="flex-row gap-3">
        {['Male', 'Female', 'Other'].map((g) => (
          <Pressable
            key={g}
            onPress={() => setGender(g)}
            className={`flex-1 items-center justify-center rounded-[14px] border py-3 ${
              gender === g
                ? 'bg-brand border-brand'
                : preferences.darkMode
                ? 'border-[#1a1a1a] bg-[#080808]'
                : 'border-line bg-card'
            }`}
          >
            <Text
              className={`font-bold ${
                gender === g
                  ? 'text-white'
                  : preferences.darkMode
                  ? 'text-white'
                  : 'text-ink'
              }`}
            >
              {g}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  </>
) : null}

        {step === 3 && userType === 'student' ? (<ChoiceGrid darkMode={preferences.darkMode} title="Which class are you in?" icon="Class" options={studentClassOptions} selected={selectedClass} onSelect={(value) => {
                setSelectedClass(value);
                if (value !== 'Other')
                    setOtherClass('');
            }} otherValue={otherClass} setOtherValue={setOtherClass}/>) : null}

        {step === 3 && userType === 'parent' ? (<StepInput darkMode={preferences.darkMode} title="What's your child's name?" icon="Child" value={childName} setValue={setChildName} placeholder="Enter your child's name"/>) : null}

        {step === 4 ? (<ChoiceGrid darkMode={preferences.darkMode} title={userType === 'parent' ? 'Which class is your child currently studying in?' : 'Which Stream Excites you the most?'} icon={userType === 'parent' ? 'Class' : 'Stream'} options={userType === 'parent' ? studentClassOptions : streamOptions} selected={userType === 'parent' ? selectedClass : selectedStream} onSelect={(value) => {
                if (userType === 'parent') {
                    setSelectedClass(value);
                    if (value !== 'Other')
                        setOtherClass('');
                    return;
                }
                setSelectedStream(value);
                if (value !== 'Other')
                    setOtherStream('');
            }} otherValue={userType === 'parent' ? otherClass : otherStream} setOtherValue={userType === 'parent' ? setOtherClass : setOtherStream}/>) : null}

        {step === 5 && userType === 'student' ? (<MultiChoice darkMode={preferences.darkMode} title="What are your interests?"  icon="Interests" options={interestOptions} selected={selectedInterests} onToggle={(value) => toggleMulti(value, selectedInterests, setSelectedInterests)}/>) : null}

        {step === 5 && userType === 'parent' ? (<ChoiceGrid darkMode={preferences.darkMode} title="Which stream interests your child?" icon="Stream" options={streamOptions} selected={selectedStream} onSelect={(value) => {
                setSelectedStream(value);
                if (value !== 'Other')
                    setOtherStream('');
            }} otherValue={otherStream} setOtherValue={setOtherStream}/>) : null}

     {step === 6 && userType === 'student' ? (
   <ChoiceList
      darkMode={preferences.darkMode}
      title="How clear are you about your direction?"
      icon="Clarity"
      options={clarityOptions}
      selected={selectedClarity}
      onSelect={setSelectedClarity}
   />
) : null}

{step === 7 && userType === 'student' ? (
   <MultiChoice
      darkMode={preferences.darkMode}
      title="What are your core strengths?"
      icon="Strengths"
      options={strengthOptions}
      selected={selectedStrengths}
      onToggle={(value) =>
         toggleMulti(value, selectedStrengths, setSelectedStrengths)
      }
   />
) : null}

{((step === 8 && userType === 'student') ||
  (step === 6 && userType === 'parent')) ? (
   <MultiChoice
      darkMode={preferences.darkMode}
      title="What matters most to you in a career?"
      icon="Priorities"
      options={priorityOptions}
      selected={selectedPriorities}
      onToggle={(value) =>
         toggleMulti(value, selectedPriorities, setSelectedPriorities)
      }
   />
) : null}
        {step === 9 ? (<SuccessStep darkMode={preferences.darkMode}/>) : null}

        </Animated.View>

        <AnimatedPressable className="mt-auto items-center rounded-[18px] bg-brand py-4" disabled={!canProceed()} onPress={next}>
          <ButtonLabel label={step === 0 ? 'Continue' : step === 1 ? 'Start Journey' : step === 8 ? 'Finish' : step === 9 ? 'Continue' : 'Next'} showArrow={step === 0 || step === 9 || (step > 1 && step < 8)}/>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>);
}
function StepInput({ title, icon, value, setValue, placeholder, darkMode, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className={`text-center text-[24px] font-black leading-8 ${darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={palette.muted} className={`h-14 rounded-[18px] border px-4 text-[16px] ${darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`}/>
    </View>);
}
function ChoiceGrid({ title, icon, options, selected, onSelect, otherValue, setOtherValue, darkMode, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className={`text-center text-[24px] font-black leading-8 ${darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      <ChoiceRows options={options} renderOption={(option) => <Chip darkMode={darkMode} key={option} label={option} active={selected === option} onPress={() => onSelect(option)}/>}/>
      {selected === 'Other' ? (<TextInput value={otherValue} onChangeText={setOtherValue} placeholder="Please write here" placeholderTextColor={palette.muted} className={`h-14 rounded-[18px] border px-4 text-[16px] ${darkMode ? 'border-[#1a1a1a] bg-[#080808] text-white' : 'border-line bg-card text-ink'}`}/>) : null}
    </View>);
}
function ChoiceList({ title, subtitle, icon, options, selected, onSelect, darkMode, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className={`text-center text-[24px] font-black leading-8 ${darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      <Text className={`text-center text-[13px] ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{subtitle}</Text>
      <ChoiceRows options={options} renderOption={(option) => <Chip darkMode={darkMode} key={option} label={option} active={selected === option} onPress={() => onSelect(option)}/>}/>
    </View>);
}
function MultiChoice({ title, subtitle, icon, options, selected, onToggle, darkMode, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className={`text-center text-[24px] font-black leading-8 ${darkMode ? 'text-white' : 'text-ink'}`}>{title}</Text>
      <Text className={`text-center text-[13px] ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>{subtitle}</Text>
      <ChoiceRows options={options} renderOption={(option) => <Chip darkMode={darkMode} key={option} label={option} active={selected.includes(option)} onPress={() => onToggle(option)}/>}/>
    </View>);
}
function ChoiceRows({ options, renderOption }) {
    const rows = chunkOptions(options);
    return (<View className="gap-3">
      {rows.map((row, index) => (<View key={`row-${index}`} className="flex-row gap-3">
          <View className="flex-1">{renderOption(row[0])}</View>
          <View className="flex-1">{row[1] ? renderOption(row[1]) : <View className="min-h-[64px]"/>}</View>
        </View>))}
    </View>);
}
function Chip({ label, active, onPress, darkMode }) {
    return (<AnimatedPressable onPress={onPress} className={`min-h-[64px] w-full items-center justify-center rounded-[18px] border px-3 py-[14px] ${active ? 'border-brand bg-brand' : darkMode ? 'border-[#1a1a1a] bg-[#080808]' : 'border-line bg-card'}`} gradient={active}>
      <Text className={`text-center text-[13px] font-bold leading-[18px] ${active ? 'text-white' : darkMode ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </AnimatedPressable>);
}
function SuccessStep({ darkMode }) {
    return (<View className="flex-grow items-center justify-end gap-4 pt-8 pb-2">
      <BeeArrivalAnimation darkMode={darkMode}/>
      <View className="items-center gap-3">
        <Text className={`text-center text-[28px] font-black leading-9 ${darkMode ? 'text-white' : 'text-ink'}`}>Great! We&apos;ve personalized your experience</Text>
        <Text className={`max-w-[310px] text-center text-[15px] leading-6 ${darkMode ? 'text-[#b7aeb9]' : 'text-muted'}`}>
          Your career journey is ready. Let&apos;s sign you in to get started!
        </Text>
      </View>
    </View>);
}
function BeeArrivalAnimation({ darkMode }) {
    const boxScale = useRef(new Animated.Value(0)).current;
    const boxRotate = useRef(new Animated.Value(-180)).current;
    const beeOpacity = useRef(new Animated.Value(0)).current;
    const beeTranslate = useRef(new Animated.Value(18)).current;
    const beeEntranceScale = useRef(new Animated.Value(0.72)).current;
    const beeFloat = useRef(new Animated.Value(0)).current;
    const beeRotate = useRef(new Animated.Value(0)).current;
    const beeScale = useRef(new Animated.Value(1)).current;
    const ringPulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        boxScale.setValue(0);
        boxRotate.setValue(-180);
        beeOpacity.setValue(0);
        beeTranslate.setValue(18);
        beeEntranceScale.setValue(0.72);
        beeFloat.setValue(0);
        beeRotate.setValue(0);
        beeScale.setValue(1);
        ringPulse.setValue(0);
        const loops = [];
        const entrance = Animated.parallel([
            Animated.spring(boxScale, { toValue: 1, stiffness: 140, damping: 11, mass: 0.85, useNativeDriver: true }),
            Animated.timing(boxRotate, { toValue: 0, duration: 720, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
            Animated.sequence([
                Animated.delay(180),
                Animated.parallel([
                    Animated.timing(beeOpacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.spring(beeTranslate, { toValue: 0, stiffness: 170, damping: 16, mass: 0.8, useNativeDriver: true }),
                    Animated.spring(beeEntranceScale, { toValue: 1, stiffness: 180, damping: 15, mass: 0.82, useNativeDriver: true }),
                ]),
            ]),
        ]);
        entrance.start();
        const floatLoop = Animated.loop(Animated.parallel([
            Animated.sequence([
                Animated.timing(beeFloat, { toValue: -8, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(beeFloat, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.timing(beeRotate, { toValue: 8, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(beeRotate, { toValue: -8, duration: 375, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(beeRotate, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.timing(beeScale, { toValue: 1.05, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(beeScale, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
        ]));
        const ringLoop = Animated.loop(Animated.sequence([
            Animated.timing(ringPulse, { toValue: 1, duration: 1450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ringPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.delay(250),
        ]));
        loops.push(floatLoop, ringLoop);
        const startTimer = setTimeout(() => {
            floatLoop.start();
            ringLoop.start();
        }, 520);
        return () => {
            clearTimeout(startTimer);
            loops.forEach((loop) => loop.stop());
        };
    }, [beeEntranceScale, beeFloat, beeOpacity, beeRotate, beeScale, beeTranslate, boxRotate, boxScale, ringPulse]);
    const boxSpin = boxRotate.interpolate({ inputRange: [-180, 0], outputRange: ['-180deg', '0deg'] });
    const beeTilt = beeRotate.interpolate({ inputRange: [-8, 8], outputRange: ['-8deg', '8deg'] });
    const ringScale = ringPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.75],
    });
    const ringOpacity = ringPulse.interpolate({
        inputRange: [0, 0.72, 1],
        outputRange: [0.22, 0, 0],
    });
    return (<View className="items-center justify-center pb-2 pt-3">
      <View className="relative h-[170px] w-full items-center justify-center overflow-hidden">
        <Animated.View style={{
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
            }} className={`absolute h-36 w-36 rounded-full border border-brand/25 ${darkMode ? 'bg-[#080808]' : 'bg-[#fff1f4]'}`}/>
        <Animated.View className={`h-[108px] w-[108px] items-center justify-center rounded-[32px] ${darkMode ? 'bg-[#080808]' : 'bg-white'}`} style={{ transform: [{ scale: boxScale }, { rotate: boxSpin }] }}>
          <Animated.View style={{
                    opacity: beeOpacity,
                    transform: [{ translateY: beeTranslate }, { scale: beeEntranceScale }, { translateY: beeFloat }, { rotate: beeTilt }, { scale: beeScale }],
                }}>
            <BeeMascot size={76} draggable={false}/>
          </Animated.View>
        </Animated.View>
      </View>
    </View>);
}
function ButtonLabel({ label, showArrow = false }) {
    return (<View className="flex-row items-center justify-center gap-2">
      <Text className="text-[16px] font-extrabold text-white">{label}</Text>
      {showArrow ? <Ionicons name="arrow-forward" size={18} color="#ffffff"/> : null}
    </View>);
}
function chunkOptions(options) {
    const rows = [];
    for (let index = 0; index < options.length; index += 2) {
        rows.push(options.slice(index, index + 2));
    }
    return rows;
}
