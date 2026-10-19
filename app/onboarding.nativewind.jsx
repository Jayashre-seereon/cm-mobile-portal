import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../src/app-state';
import { BeeMascot } from '../src/bee-mascot';
import { palette } from '../src/careermap-data';
import { AnimatedPressable } from '../src/careermap-ui';
const studentClassOptions = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Graduate'];
const streamOptions = ['Science', 'Commerce', 'Arts & Humanities', 'Vocational', 'Not Sure Yet'];
const interestOptions = ['Technology & Computers', 'Problem Solving', 'Creativity & Design', 'Helping People', 'Business'];
const clarityOptions = [
    'Clear on my goal, need the right path',
    'Choosing between a few options',
    "Confused between my choice and parents' expectations",
    'I keep changing my options',
];
const strengthOptions = ['Analytical Thinking', 'Communication', 'Creativity', 'Leadership', 'Problem-solving'];
const priorityOptions = ['High Earning Potential', 'Passion and Interest', 'Work-Life Balance', 'Growth and Advancement'];
export default function OnboardingScreen() {
    const { saveOnboarding } = useAppState();
    const [userType, setUserType] = useState('');
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [childName, setChildName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStream, setSelectedStream] = useState('');
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedClarity, setSelectedClarity] = useState('');
    const [selectedStrengths, setSelectedStrengths] = useState([]);
    const [selectedPriorities, setSelectedPriorities] = useState([]);
    const totalSteps = 10;
    const progressCount = totalSteps - 2;
    const toggleMulti = (value, selected, setSelected) => {
        setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    };
    const canProceed = () => {
        if (step === 0)
            return userType !== '';
        if (step === 2)
            return name.trim().length > 0;
        if (step === 3)
            return userType === 'parent' ? childName.trim().length > 0 : selectedClass !== '';
        if (step === 4)
            return userType === 'parent' ? selectedClass !== '' : selectedStream !== '';
        if (step === 5)
            return userType === 'parent' ? selectedStream !== '' : selectedInterests.length > 0;
        if (step === 6)
            return selectedClarity !== '';
        if (step === 7)
            return selectedStrengths.length > 0;
        if (step === 8)
            return selectedPriorities.length > 0;
        return true;
    };
    const next = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
            return;
        }
        saveOnboarding({
            userType,
            name,
            childName,
            selectedClass,
            selectedStream,
            selectedInterests,
            selectedClarity,
            selectedStrengths,
            selectedPriorities,
            selectedGuidance: '',
        });
        router.replace('/login');
    };
    return (<SafeAreaView className="flex-1 bg-transparent">
      <ScrollView className="flex-1" contentContainerClassName="flex-grow gap-5 px-6 py-6" showsVerticalScrollIndicator={false}>
        {step > 0 && step < totalSteps - 1 ? (<View className="flex-row gap-1.5">
            {Array.from({ length: progressCount }).map((_, index) => (<View key={index} className={`h-1.5 flex-1 rounded-full ${index < step ? 'bg-brand' : 'bg-[#e6e0dc]'}`}/>))}
          </View>) : null}

        {step === 0 ? (<View className="flex-grow items-center justify-center gap-4 py-7">
            <BeeMascot size={86}/>
            <Text className="text-center text-[28px] font-black leading-9 text-ink">Choose Your Roadmap</Text>
            <Text className="max-w-[300px] text-center text-[14px] leading-[22px] text-muted">Tell us who you are so we can personalize your experience</Text>
            <View className="w-full gap-4">
              <Pressable onPress={() => setUserType('student')} className={`flex-row items-center gap-4 rounded-[24px] border-2 p-[18px] ${userType === 'student' ? 'border-brand bg-[#fff1f4]' : 'border-line bg-card'}`}>
                <View className={`h-14 w-14 items-center justify-center rounded-[18px] ${userType === 'student' ? 'bg-brand' : 'bg-[#eee8e5]'}`}>
                  <Text className={`text-[22px] font-black ${userType === 'student' ? 'text-white' : 'text-muted'}`}>S</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[17px] font-extrabold text-ink">I&apos;m a Student</Text>
                  <Text className="text-[12px] text-muted">Explore career paths for myself</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => setUserType('parent')} className={`flex-row items-center gap-4 rounded-[24px] border-2 p-[18px] ${userType === 'parent' ? 'border-brand bg-[#fff1f4]' : 'border-line bg-card'}`}>
                <View className={`h-14 w-14 items-center justify-center rounded-[18px] ${userType === 'parent' ? 'bg-brand' : 'bg-[#eee8e5]'}`}>
                  <Text className={`text-[22px] font-black ${userType === 'parent' ? 'text-white' : 'text-muted'}`}>P</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[17px] font-extrabold text-ink">I&apos;m a Parent</Text>
                  <Text className="text-[12px] text-muted">Explore careers for my child</Text>
                </View>
              </Pressable>
            </View>
          </View>) : null}

        {step === 1 ? (<View className="flex-grow items-center justify-center gap-4 py-7">
            <BeeMascot size={68}/>
            <Text className="text-center text-[28px] font-black leading-9 text-ink">{userType === 'parent' ? 'Welcome, Parent!' : "Hi! I'm your Career Guide"}</Text>
            <Text className="max-w-[300px] text-center text-[14px] leading-[22px] text-muted">
              {userType === 'parent'
                ? "We'll help you explore career options for your child's future."
                : "I'll help you explore the best career path. Let's get started."}
            </Text>
          </View>) : null}

        {step === 2 ? (<StepInput title="What's your name?" icon="Name" value={name} setValue={setName} placeholder={userType === 'parent' ? 'Enter your name' : 'Enter your full name'}/>) : null}

        {step === 3 && userType === 'student' ? (<ChoiceGrid title="Which class are you in?" icon="Class" options={studentClassOptions} selected={selectedClass} onSelect={setSelectedClass}/>) : null}

        {step === 3 && userType === 'parent' ? (<StepInput title="What's your child's name?" icon="Child" value={childName} setValue={setChildName} placeholder="Enter your child's name"/>) : null}

        {step === 4 ? (<ChoiceGrid title={userType === 'parent' ? 'Which class is your child in?' : 'Which stream interests you?'} icon={userType === 'parent' ? 'Class' : 'Stream'} options={userType === 'parent' ? studentClassOptions : streamOptions} selected={userType === 'parent' ? selectedClass : selectedStream} onSelect={userType === 'parent' ? setSelectedClass : setSelectedStream}/>) : null}

        {step === 5 && userType === 'student' ? (<MultiChoice title="What are your interests?" subtitle="Select all that apply" icon="Interests" options={interestOptions} selected={selectedInterests} onToggle={(value) => toggleMulti(value, selectedInterests, setSelectedInterests)}/>) : null}

        {step === 5 && userType === 'parent' ? (<ChoiceGrid title="Which stream interests your child?" icon="Stream" options={streamOptions} selected={selectedStream} onSelect={setSelectedStream}/>) : null}

        {step === 6 ? (<ChoiceList title="Career Clarity" subtitle="How clear are you about your direction?" icon="Clarity" options={clarityOptions} selected={selectedClarity} onSelect={setSelectedClarity}/>) : null}

        {step === 7 ? (<MultiChoice title="Key Strengths" subtitle="What are your core strengths? Pick all that fit." icon="Strengths" options={strengthOptions} selected={selectedStrengths} onToggle={(value) => toggleMulti(value, selectedStrengths, setSelectedStrengths)}/>) : null}

        {step === 8 ? (<MultiChoice title="Career Priorities" subtitle="What matters most to you in a career?" icon="Priorities" options={priorityOptions} selected={selectedPriorities} onToggle={(value) => toggleMulti(value, selectedPriorities, setSelectedPriorities)}/>) : null}

        {step === 9 ? (<SuccessStep/>) : null}

        <AnimatedPressable className="mt-auto items-center rounded-[18px] bg-brand py-4" disabled={!canProceed()} onPress={next}>
          <ButtonLabel label={step === 0 ? 'Continue' : step === 1 ? 'Start Journey' : step === 8 ? 'Finish' : step === 9 ? 'Continue' : 'Next'} showArrow={step === 0 || step === 9 || (step > 1 && step < 8)}/>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>);
}
function StepInput({ title, icon, value, setValue, placeholder, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className="text-center text-[24px] font-black leading-8 text-ink">{title}</Text>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={palette.muted} className="h-14 rounded-[18px] border border-line bg-card px-4 text-[16px] text-ink"/>
    </View>);
}
function ChoiceGrid({ title, icon, options, selected, onSelect, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className="text-center text-[24px] font-black leading-8 text-ink">{title}</Text>
      <ChoiceRows options={options} renderOption={(option) => <Chip key={option} label={option} active={selected === option} onPress={() => onSelect(option)}/>}/>
    </View>);
}
function ChoiceList({ title, subtitle, icon, options, selected, onSelect, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className="text-center text-[24px] font-black leading-8 text-ink">{title}</Text>
      <Text className="text-center text-[13px] text-muted">{subtitle}</Text>
      <ChoiceRows options={options} renderOption={(option) => <Chip key={option} label={option} active={selected === option} onPress={() => onSelect(option)}/>}/>
    </View>);
}
function MultiChoice({ title, subtitle, icon, options, selected, onToggle, }) {
    return (<View className="gap-[14px] pt-2">
      <Text className="text-center text-[26px] font-extrabold text-brand">{icon}</Text>
      <Text className="text-center text-[24px] font-black leading-8 text-ink">{title}</Text>
      <Text className="text-center text-[13px] text-muted">{subtitle}</Text>
      <ChoiceRows options={options} renderOption={(option) => <Chip key={option} label={option} active={selected.includes(option)} onPress={() => onToggle(option)}/>}/>
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
function Chip({ label, active, onPress }) {
    return (<AnimatedPressable onPress={onPress} className={`min-h-[64px] w-full items-center justify-center rounded-[18px] border px-3 py-[14px] ${active ? 'border-brand bg-brand' : 'border-line bg-card'}`} gradient={active}>
      <Text className={`text-center text-[13px] font-bold leading-[18px] ${active ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </AnimatedPressable>);
}
function SuccessStep() {
    return (<View className="flex-grow items-center justify-end gap-4 pt-8 pb-2">
      <BeeArrivalAnimation/>
      <View className="items-center gap-3">
        <Text className="text-center text-[28px] font-black leading-9 text-ink">Great! We&apos;ve personalized your experience</Text>
        <Text className="max-w-[310px] text-center text-[15px] leading-6 text-muted">
          Your career journey is ready. Let&apos;s sign you in to get started!
        </Text>
      </View>
    </View>);
}
function BeeArrivalAnimation() {
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
            }} className="absolute h-36 w-36 rounded-full border border-brand/25 bg-[#fff1f4]"/>
        <Animated.View className="h-[108px] w-[108px] items-center justify-center rounded-[32px] bg-white" style={{ transform: [{ scale: boxScale }, { rotate: boxSpin }] }}>
          <Animated.View style={{
                    opacity: beeOpacity,
                    transform: [{ translateY: beeTranslate }, { scale: beeEntranceScale }, { translateY: beeFloat }, { rotate: beeTilt }, { scale: beeScale }],
                }}>
            <BeeMascot size={76}/>
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
