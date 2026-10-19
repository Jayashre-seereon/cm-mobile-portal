import { Text, View } from 'react-native';
import { Screen, SectionHeader } from '../../src/careermap-ui';
export default function AboutScreen() {
    return (<Screen>
      <SectionHeader title="About CareerMap" subtitle="This screen explains what was brought across from the web prototype."/>
      <View className="gap-2.5 rounded-[24px] border border-line bg-card p-5">
        <Text className="text-[18px] font-black text-ink">What&apos;s included</Text>
        <Text className="text-[14px] leading-[22px] text-muted">
          This Expo project now reflects the overall direction of your Vercel prototype: a dashboard-first experience
          with career discovery, student profile details, notifications, subscription plans, and settings.
        </Text>
        <Text className="text-[14px] leading-[22px] text-muted">
          The content is implemented as a mobile-friendly adaptation rather than a pixel-perfect web clone, which keeps
          it natural inside React Native while still matching the prototype&apos;s information architecture.
        </Text>
      </View>
    </Screen>);
}
