import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  PixelRatio,
  useWindowDimensions,
} from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { getAttemptResult } from '../../src/api/psychometricAssessmentApi';
import { CLUSTERS, pct } from '../../src/features/assessment/data/careerCompassData';
import { SAMPLE_PROFILING_REPORT } from '../../src/features/assessment/data/assessmentConstants';
import YourProfilingReport from '../../src/features/assessment/components/YourProfilingReport';

// Image Assets
const Logo = require('../../assets/images/logo_white.png');
const ReportImg1 = require('../../assets/report/report_1.png');
const ReportImg2 = require('../../assets/report/report_2.png');
const ReportImg3 = require('../../assets/report/report_3.png');
const ReportImg4 = require('../../assets/report/report_4.png');
const ReportImg5 = require('../../assets/report/report_5.png');
const ReportImg6 = require('../../assets/report/report_6.png');
const ReportImg7 = require('../../assets/report/report_7.png');
const ReportImg8 = require('../../assets/report/report_8.png');
const ReportImg9 = require('../../assets/report/report_9.png');

const FeaturePsychometric = require('../../assets/report/feature_psychometric.jpg');
const FeatureOnetoone = require('../../assets/report/feature_onetoone.jpg');
const FeatureMentorship = require('../../assets/report/feature_mentorship.jpg');
const FeatureCell = require('../../assets/report/feature_cell.jpg');
const FeatureBehavioral = require('../../assets/report/feature_behavioral.jpg');
const FeatureDashboard = require('../../assets/report/feature_dashboard.jpg');

// Color Palette matching User Portal PDF Specifications
const COLORS = {
  red: '#8C1814',
  redDark: '#72120F',
  redLight: '#FDF4F3',
  redTint: '#FBEBE9',
  slate: '#5B7692',
  slateDark: '#475F77',
  slateLight: '#EBF4FA',
  slateBorder: '#D6E7F3',
  green: '#4D6D47',
  greenDark: '#3B5436',
  greenLight: '#EEF5EE',
  greenBorder: '#D6E6D5',
  gold: '#B98A3C',
  goldDark: '#966E2E',
  goldLight: '#FAF4E8',
  goldBorder: '#EDDEC3',
  lavender: '#5E7399',
  lavenderLight: '#F1EFF7',
  lavenderBorder: '#DDD7EA',
  dark: '#1E232A',
  body: '#374151',
  muted: '#6B7280',
  line: '#E5E7EB',
  pageBg: '#EAEFF4',
};

// Scale report typography up slightly while keeping headings' existing hierarchy.
const REPORT_TEXT_SCALE = 1.15;
const reportText = (style) => ({
  ...style,
  fontSize: style.fontSize * REPORT_TEXT_SCALE,
  ...(style.lineHeight ? { lineHeight: style.lineHeight * REPORT_TEXT_SCALE } : {}),
});

// 32 Pages List for Jump Navigation (Page 3 is Your Profiling)
const REPORT_PAGES = [
  { id: 1, label: 'Page 1: Cover Page' },
  { id: 2, label: 'Page 2: Declaration' },
  { id: 3, label: 'Page 3: Your Profiling' },
  { id: 4, label: 'Page 4: Introduction' },
  { id: 5, label: 'Page 5: Interest Overview' },
  { id: 6, label: 'Page 6: Interest Details (01-03)' },
  { id: 7, label: 'Page 7: Interest Details (04-06)' },
  { id: 8, label: 'Page 8: Interest Scores' },
  { id: 9, label: 'Page 9: Personality Overview' },
  { id: 10, label: 'Page 10: Personality Suggestions' },
  { id: 11, label: 'Page 11: Personality Scores' },
  { id: 12, label: 'Page 12: Learning Styles' },
  { id: 13, label: 'Page 13: Learning Details (01-02)' },
  { id: 14, label: 'Page 14: Learning Details (03-04)' },
  { id: 15, label: 'Page 15: Learning Style Scores' },
  { id: 16, label: 'Page 16: Work Values' },
  { id: 17, label: 'Page 17: Work Values Suggestions' },
  { id: 18, label: 'Page 18: Work Values Scores' },
  { id: 19, label: 'Page 19: Goal Orientation (Short)' },
  { id: 20, label: 'Page 20: Goal Orientation (Long)' },
  { id: 21, label: 'Page 21: Aptitude Overview' },
  { id: 22, label: 'Page 22: Aptitude (Numerical)' },
  { id: 23, label: 'Page 23: Aptitude (Logical/Verbal)' },
  { id: 24, label: 'Page 24: Aptitude (Voc/Mech)' },
  { id: 25, label: 'Page 25: Aptitude (Spatial)' },
  { id: 26, label: 'Page 26: Aptitude Scores' },
  { id: 27, label: 'Page 27: Top Cluster #1' },
  { id: 28, label: 'Page 28: Clusters #2 & #3' },
  { id: 29, label: 'Page 29: Clusters #4 & #5' },
  { id: 30, label: 'Page 30: Study & Pathway Advice' },
  { id: 31, label: 'Page 31: Complete Career Map' },
  { id: 32, label: 'Page 32: About Career Map' },
];

// Common Header for Pages 2 to 31
function PageHeader({ studentFirstName }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
        <Text style={reportText({ fontSize: 17.2, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark })}>
          {studentFirstName || 'Aryaman'}
        </Text>
        <Image
          source={Logo}
          style={{ width: 100, height: 26, tintColor: COLORS.red }}
          resizeMode="contain"
        />
      </View>
      <View style={{ height: 2, backgroundColor: COLORS.red, width: '100%' }} />
    </View>
  );
}

// Common Footer for Pages 2 to 31
function PageFooter({ pageNum }) {
  return (
    <View style={{ marginTop: 'auto', paddingTop: 16 }}>
      <View style={{ height: 1, backgroundColor: COLORS.line, width: '100%', marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.redLight, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={reportText({ fontSize: 10.4 })}>📞</Text>
            </View>
            <Text style={reportText({ fontSize: 10.9, color: COLORS.muted, fontFamily: 'Poppins_500Medium', fontWeight: '500' })}>+91 94372 08179</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.redLight, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={reportText({ fontSize: 10.4 })}>✉️</Text>
            </View>
            <Text style={reportText({ fontSize: 10.9, color: COLORS.muted, fontFamily: 'Poppins_500Medium', fontWeight: '500' })}>careermap2016@gmail.com</Text>
          </View>
        </View>
        <Text style={reportText({ fontSize: 11.5, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark })}>Page No {pageNum}</Text>
      </View>
    </View>
  );
}

// Section Title Pill Header
function TitlePill({ title, colorClass = 'red' }) {
  const isGreen = colorClass === 'green';
  const isDarkGreen = colorClass === 'dark-green';
  const isLavender = colorClass === 'lavender';
  const isGold = colorClass === 'gold';

  const borderColor = isDarkGreen
    ? COLORS.greenDark
    : isGreen
    ? COLORS.green
    : isLavender
    ? COLORS.lavender
    : isGold
    ? COLORS.gold
    : COLORS.red;

  const bgColor = isDarkGreen
    ? COLORS.greenLight
    : isGreen
    ? COLORS.greenLight
    : isLavender
    ? COLORS.lavenderLight
    : isGold
    ? COLORS.goldLight
    : COLORS.redLight;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1.5,
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 12,
        marginBottom: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: borderColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: borderColor,
          }}
        />
      </View>
      <Text
        style={{
          color: borderColor,
          fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
          fontSize: 13.2,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
    </View>
  );
}

// Detail Card Row (Used in Interests, Learning Styles, Aptitudes, Goals)
function DetailCardRow({ num, title, color = 'red', desc, traits, enjoys, environments }) {
  const isLavender = color === 'lavender';
  const isGold = color === 'gold';
  const badgeBg = isLavender ? COLORS.lavender : isGold ? COLORS.gold : COLORS.red;
  const bodyBg = isLavender ? COLORS.lavenderLight : isGold ? COLORS.goldLight : COLORS.redLight;

  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: badgeBg,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#ffffff',
      }}
    >
      <View
        style={{
          width: 95,
          backgroundColor: badgeBg,
          padding: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 13.8 }}>{num}</Text>
        </View>
        <Text
          style={{
            color: '#ffffff',
            fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
            fontSize: 10.9,
            textAlign: 'center',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ flex: 1, padding: 10, backgroundColor: bodyBg }}>
        {desc ? (
          <Text style={{ fontSize: 12.6, color: COLORS.dark, fontFamily: 'Poppins_500Medium', fontWeight: '500', lineHeight: 18.4, marginBottom: 4 }}>
            {desc}
          </Text>
        ) : null}
        {traits ? (
          <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2, marginTop: 2 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>Key Traits: </Text>
            {traits}
          </Text>
        ) : null}
        {enjoys ? (
          <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2, marginTop: 2 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>Enjoys: </Text>
            {enjoys}
          </Text>
        ) : null}
        {environments ? (
          <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2, marginTop: 2 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>Ideal Environments: </Text>
            {environments}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Trait Card Row (Used in Personality & Work Values Suggestions)
function TraitCardRow({ num, name, band, text, color = 'green' }) {
  const isHigh = band === 'HIGH';
  const badgeBg = color === 'green' ? COLORS.green : COLORS.greenDark;
  const bodyBg = COLORS.greenLight;
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: badgeBg,
        overflow: 'hidden',
        marginBottom: 9,
        backgroundColor: '#ffffff',
      }}
    >
      <View
        style={{
          width: 125,
          backgroundColor: badgeBg,
          padding: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 11.5 }}>{num}</Text>
          </View>
          <Text
            style={{
              color: '#ffffff',
              fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
              fontSize: 10.4,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}
          >
            {name}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: isHigh ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <Text
            style={{
              fontSize: 9.8,
              fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
              color: isHigh ? badgeBg : '#ffffff',
              letterSpacing: 0.4,
            }}
          >
            {band}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, padding: 10, backgroundColor: bodyBg, justifyContent: 'center' }}>
        <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>{text}</Text>
      </View>
    </View>
  );
}

// Banner Component for Score Representation
function ScoreRepBanner({ title, color = 'red' }) {
  const bg =
    color === 'green'
      ? COLORS.green
      : color === 'dark-green'
      ? COLORS.greenDark
      : color === 'lavender'
      ? COLORS.lavender
      : color === 'gold'
      ? COLORS.gold
      : COLORS.red;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 12,
        gap: 8,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff' }} />
      <Text
        style={{
          color: '#ffffff',
          fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
          fontSize: 12.1,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
    </View>
  );
}

// Donut Gauge Component for Learning Styles & Goal Orientation
function DonutGauge({ percent, color, trackColor, size = 90, strokeWidth = 8, textColor = '#1E232A' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18.4, fontFamily: 'Poppins_900Black', fontWeight: '900', color: textColor }}>{percent}%</Text>
      </View>
    </View>
  );
}

// Cluster Match Card for Pages 26, 27, 28
function ClusterMatchCard({ cluster, colorTheme = 'red', showWhyFit = true }) {
  const headerBg =
    colorTheme === 'salmon'
      ? '#96473F'
      : colorTheme === 'blue'
      ? '#4B6B94'
      : colorTheme === 'green'
      ? COLORS.green
      : colorTheme === 'gold'
      ? COLORS.gold
      : COLORS.red;

  const dotColor = headerBg;

  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: headerBg,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#ffffff',
      }}
    >
      <View
        style={{
          backgroundColor: headerBg,
          paddingVertical: 7,
          paddingHorizontal: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
            fontSize: 13.2,
            textTransform: 'uppercase',
            flex: 1,
            marginRight: 6,
          }}
          numberOfLines={1}
        >
          {cluster.rank} {cluster.name}
        </Text>
        <Text style={{ color: '#ffffff', fontFamily: 'Poppins_900Black', fontWeight: '900', fontSize: 16.1 }}>
          {cluster.matchPercentage}%
        </Text>
      </View>

      <View style={{ padding: 10, backgroundColor: '#FFF9F8' }}>
        {cluster.description ? (
          <Text style={{ fontSize: 12.1, color: '#1E293B', fontFamily: 'Poppins_600SemiBold', fontWeight: '600', lineHeight: 17.2, marginBottom: 4 }}>
            {cluster.description}
          </Text>
        ) : null}
        {showWhyFit && cluster.why_fit ? (
          <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16.1, marginBottom: 4 }}>
            {cluster.why_fit}
          </Text>
        ) : null}
        {cluster.streams_and_pathways_india ? (
          <Text style={{ fontSize: 11.5, color: '#334155', lineHeight: 16.1, marginBottom: 6 }}>
            <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>Pathway in India: </Text>
            {cluster.streams_and_pathways_india}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 }}>
          {(cluster.careers || []).slice(0, 11).map((c, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 6,
                paddingVertical: 3,
                paddingHorizontal: 6,
                gap: 4,
              }}
            >
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: dotColor }} />
              <Text style={{ fontSize: 10.9, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: COLORS.dark }}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// The counsellor art is decorative; this map makes the five recommendations
// next to it readable and data-driven for the current assessment attempt.
function TopClustersMap({ clusters }) {
  const colors = ['#70B86B', '#4D95D7', '#9A76CA', '#DC984F', '#47B9B9'];

  return (
    <View
      accessible
      accessibilityLabel="Your five top career clusters"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 184,
        marginVertical: 6,
      }}
    >
      <View style={{ width: '52%', alignItems: 'center', justifyContent: 'center' }}>
        <Image source={ReportImg7} style={{ width: '100%', height: 210 }} resizeMode="contain" />
      </View>

   <View style={{ width: 20, height: 164, marginLeft: -40, justifyContent: 'center' }} pointerEvents="none">
  <Svg width="20" height="164" viewBox="0 0 20 164">
    <Line x1="2" y1="82" x2="8" y2="82" stroke="#64748B" strokeWidth="1.75" strokeDasharray="3 2" />
    <Circle cx="2" cy="82" r="2.8" fill="#17467F" />
    {[16, 49, 82, 115, 148].map((y) => (
      <Line key={y} x1="8" y1="82" x2="20" y2={y} stroke="#64748B" strokeWidth="1.75" strokeDasharray="3 2" />
    ))}
  </Svg>
</View>

      <View style={{ flex: 1, gap: 5 }}>
        {clusters.slice(0, 5).map((cluster, index) => {
          const color = colors[index];
          return (
            <View
              key={`${cluster.code || cluster.name}-${index}`}
              style={{
                minHeight: 28,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: color,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                paddingVertical: 4,
                paddingHorizontal: 5,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: color,
                  marginRight: 5,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10.4, fontFamily: 'Poppins_900Black', fontWeight: '900' }}>{index + 1}</Text>
              </View>
              <Text
                style={{ flex: 1, color: '#102A54', fontSize: 9.8, lineHeight: 12.1, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}
                numberOfLines={2}
              >
                {cluster.name}
              </Text>
              <Text style={{ color, fontSize: 11.5, fontFamily: 'Poppins_900Black', fontWeight: '900', marginLeft: 4 }}>
                {cluster.matchPercentage}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function generateReportHtml(data) {
  const {
    studentName,
    studentFirstName,
    studentClass,
    studentSchool,
    studentEmail,
    studentPhone,
    formattedDate,
    yourProfiling,
    hollandCode,
    top5Clusters,
    interestScoreMap,
    personScoreMap,
    valScoreMap,
    varkScoreMap,
    aptList,
    shortPct,
    longPct,
    topInterests = [],
    topLearningStyles = [],
    topWorkValues = [],
    topAptitudes = [],
    topPersonalityTrait,
    goalOrientationSummary,
  } = data;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const safe = (value) => escapeHtml(value);
  const page = (number, title, body) => `<section class="pdf-page"><header><strong>${safe(studentFirstName)}</strong><b>CAREERMAP</b></header><h1>${safe(title)}</h1>${body}<footer>CareerMap • +91 94372 08179 • careermap2016@gmail.com <span>Page No ${number}</span></footer></section>`;
  const scoresPage = (number, title, entries, tone = '') => page(number, title, entries.map(([label, value]) => `<div class="score"><strong>${safe(label)}</strong><div class="track"><i class="${tone}" style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></i></div><b>${safe(value)}%</b></div>`).join(''));
  const detailsPage = (number, title, items) => page(number, title, items.map((item, index) => `<article class="card"><strong>${String(index + 1).padStart(2, '0')} · ${safe(item.label)}</strong><p>Score: ${safe(item.score)}%${item.band ? ` · ${safe(item.band)}` : ''}</p><p>${safe(item.description || item.note || '')}</p></article>`).join(''));
  const featureItems = (items, fallback) => items?.length ? items : fallback;
  const interestItems = featureItems(topInterests, Object.entries(interestScoreMap).map(([facet, score]) => ({ label: facet, score })));
  const learningItems = featureItems(topLearningStyles, Object.entries(varkScoreMap).map(([facet, score]) => ({ label: facet, score })));
  const valueItems = featureItems(topWorkValues, Object.entries(valScoreMap).map(([facet, score]) => ({ label: facet, score })));
  const aptitudeItems = featureItems(topAptitudes, aptList.map(({ label, val }) => ({ label, score: val })));

  const extraPages = [
    scoresPage(8, 'Interest Scores', Object.entries(interestScoreMap).map(([key, value]) => [key, value])),
    page(9, 'Personality Overview', `<p>Your strongest personality trait is <strong>${safe(topPersonalityTrait?.label || 'your leading trait')}</strong>. Personality traits describe common ways of thinking, feeling and working.</p>${scoresPage(9, 'Personality Scores', Object.entries(personScoreMap).map(([key, value]) => [key, value]), 'green').replace(/^.*?<h1>.*?<\/h1>/s, '').replace(/<footer>.*?<\/footer>/s, '')}`),
    detailsPage(10, 'Personality Suggestions', [topPersonalityTrait || { label: 'Personality strengths', score: 0, description: 'Use your strongest traits as a guide when exploring study and work environments.' }]),
    scoresPage(11, 'Personality Scores', Object.entries(personScoreMap).map(([key, value]) => [key, value]), 'green'),
    page(12, 'Learning Styles', `<p>Your leading learning preference: <strong>${safe(learningItems[0]?.label || 'Balanced')}</strong></p>${learningItems.map((item) => `<article class="card"><strong>${safe(item.label)}</strong><p>${safe(item.score)}% preference</p><div class="track"><i class="green" style="width:${Math.max(0, Math.min(100, Number(item.score) || 0))}%"></i></div></article>`).join('')}`),
    detailsPage(13, 'Learning Style Details (01–02)', learningItems.slice(0, 2)),
    detailsPage(14, 'Learning Style Details (03–04)', learningItems.slice(2, 4)),
    scoresPage(15, 'Learning Style Scores', Object.entries(varkScoreMap).map(([key, value]) => [key, value]), 'green'),
    scoresPage(16, 'Work Values', Object.entries(valScoreMap).map(([key, value]) => [key, value]), 'green'),
    detailsPage(17, 'Work Values Suggestions', valueItems),
    scoresPage(18, 'Work Values Scores', Object.entries(valScoreMap).map(([key, value]) => [key, value]), 'green'),
    page(19, 'Goal Orientation · Short Term', `<p>Short-term orientation score: <strong>${safe(shortPct)}%</strong></p><p>Focus on clear next steps, regular milestones and feedback as you work toward near-term goals.</p>`),
    page(20, 'Goal Orientation · Long Term', `<p>Long-term orientation score: <strong>${safe(longPct)}%</strong></p><p>Your current profile suggests: <strong>${safe(goalOrientationSummary || 'Balanced goal orientation')}</strong></p>`),
    page(21, 'Aptitude Overview', `<p>Your aptitude results show relative strengths across six core areas. Scores are shown below.</p>${aptList.map((a) => `<article class="card"><strong>${safe(a.label)} aptitude · ${safe(a.val)}%</strong><div class="track"><i style="width:${Math.min(100, Number(a.val) || 0)}%"></i></div></article>`).join('')}`),
    detailsPage(22, 'Aptitude · Numerical', aptitudeItems.filter((item) => /numerical/i.test(item.label))),
    detailsPage(23, 'Aptitude · Logical and Verbal', aptitudeItems.filter((item) => /logical|verbal/i.test(item.label))),
    detailsPage(24, 'Aptitude · Vocabulary and Mechanical', aptitudeItems.filter((item) => /vocabulary|mechanical/i.test(item.label))),
    detailsPage(25, 'Aptitude · Spatial', aptitudeItems.filter((item) => /spatial/i.test(item.label))),
    scoresPage(26, 'Aptitude Scores', aptList.map(({ label, val }) => [label, val])),
    page(27, 'Integrated Analysis · Top Cluster', `<p>Holland profile code: <strong>${safe(hollandCode)}</strong></p>${top5Clusters.slice(0, 1).map((c) => `<article class="card"><h2>${safe(c.name)} · ${safe(c.matchPercentage)}% match</h2><p>${safe(c.description)}</p><p><strong>Why it may fit:</strong> ${safe(c.why_fit)}</p><p><strong>Pathway:</strong> ${safe(c.streams_and_pathways_india)}</p><p><strong>Careers:</strong> ${safe((c.careers || []).join(', '))}</p></article>`).join('')}`),
    ...[top5Clusters.slice(1, 3), top5Clusters.slice(3, 5)].map((clusters, index) => page(28 + index, `Career Clusters ${index ? '#4 and #5' : '#2 and #3'}`, clusters.map((c) => `<article class="card"><h2>${safe(c.rank)}. ${safe(c.name)} · ${safe(c.matchPercentage)}%</h2><p>${safe(c.description)}</p><p><strong>Pathway:</strong> ${safe(c.streams_and_pathways_india)}</p><p><strong>Careers:</strong> ${safe((c.careers || []).join(', '))}</p></article>`).join(''))),
    page(30, 'Study and Pathway Advice', `<p>Learning style: <strong>${safe(learningItems[0]?.label || 'Balanced')}</strong></p><p>Goal orientation: <strong>${safe(goalOrientationSummary || '')}</strong></p><article class="card"><h2>Suggested next steps</h2><p>Explore the subject and entrance requirements for your leading career clusters. Discuss options with a teacher, counsellor or parent, then set practical study milestones.</p></article>`),
    page(31, 'Your Complete Career Map', `<h2>${safe(studentName)}</h2><div class="grid-2">${[['Holland Code', hollandCode], ['Top Cluster', top5Clusters[0]?.name], ['Top Work Value', valueItems[0]?.label], ['Top Trait', topPersonalityTrait?.label], ['Learning Style', learningItems[0]?.label], ['Goal Orientation', goalOrientationSummary]].map(([label, value]) => `<article class="metric-card"><strong>${safe(label)}</strong><p>${safe(value || '—')}</p></article>`).join('')}</div><p>This summary brings together your interests, personality, values, aptitudes and learning preferences to support further career exploration.</p>`),
    page(32, 'About CareerMap', `<p>Career Map (A Unit of Identity Group) has supported career counselling and mentorship since 2016.</p><article class="card"><strong>Your Future Deserves More Than a Guess.</strong><p>Schedule a counselling session: www.thecareermap.in · careermap2016@gmail.com · +91 94372 08179</p></article>`),
  ].join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CareerMap Assessment Report - ${studentName}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: Arial, sans-serif; color: #374151; margin: 0; padding: 0; font-size: 13px; line-height: 1.55; background: #ffffff; }
    .pdf-page p, .pdf-page .cluster-body, .pdf-page article p { text-align: justify; }
    .pdf-page { page-break-after: always; break-after: page; padding: 13mm 14mm 12mm; height: 297mm; min-height: 297mm; position: relative; display: flex; flex-direction: column; overflow: hidden; }
    .pdf-page:last-child { page-break-after: auto; break-after: auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8C1814; padding-bottom: 6px; margin-bottom: 12px; color: #1E232A; }
    header b { color: #8C1814; }
    h1 { font-size: 15px; color: #8C1814; margin: 3px 0 12px; text-transform: uppercase; }
    h2 { font-size: 13px; margin: 8px 0; color: #1E232A; }
    p { margin: 5px 0; }
    footer { margin-top: auto; padding-top: 8px; border-top: 1px solid #E5E7EB; color: #6B7280; display: flex; justify-content: space-between; font-size: 9px; }
    footer span { color: #1E232A; font-weight: 700; }
    .score { display: flex; align-items: center; gap: 8px; margin: 10px 0; }
    .score strong { width: 155px; color: #1E232A; }
    .score b { width: 34px; text-align: right; }
    .track { flex: 1; height: 12px; border-radius: 4px; background: #E5E7EB; overflow: hidden; }
    .track i { display: block; height: 100%; background: #8C1814; }
    .track i.green { background: #4D6D47; }
    .card { border: 1px solid #E5E7EB; border-radius: 6px; padding: 9px 11px; margin-bottom: 8px; background: #FAFAFA; break-inside: avoid; }
    .header-name { font-weight: 700; font-size: 15px; color: #1E232A; }
    .header-logo { font-weight: 900; font-size: 17px; color: #8C1814; letter-spacing: 1px; }
    .footer { margin-top: auto; border-top: 1px solid #E5E7EB; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6B7280; }
    .pill-title { display: inline-block; padding: 5px 14px; border-radius: 20px; font-weight: 800; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; border: 1.5px solid #8C1814; background: #FDF4F3; color: #8C1814; }
    .pill-title.green { border-color: #4D6D47; background: #EEF5EE; color: #4D6D47; }
    .pill-title.gold { border-color: #B98A3C; background: #FAF4E8; color: #B98A3C; }
    .pill-title.lavender { border-color: #5E7399; background: #F1EFF7; color: #5E7399; }
    .bar-row { display: flex; align-items: center; margin-bottom: 10px; font-size: 12px; }
    .bar-label { width: 140px; font-weight: 700; color: #1E232A; }
    .bar-track { flex: 1; height: 18px; background: #E5E7EB; border-radius: 4px; overflow: hidden; margin: 0 10px; }
    .bar-fill { height: 100%; background: #8C1814; border-radius: 4px; }
    .bar-fill.green { background: #4D6D47; }
    .bar-val { width: 40px; font-weight: 800; text-align: right; }
    .chip { display: inline-block; padding: 4px 8px; border-radius: 4px; border: 1px solid #E5E7EB; background: #ffffff; font-size: 10px; font-weight: 600; margin: 2px 4px 2px 0; }
    .cluster-box { border: 1.5px solid #8C1814; border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
    .cluster-header { background: #8C1814; color: #ffffff; padding: 8px 12px; display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; }
    .cluster-body { padding: 12px; background: #FFF9F8; font-size: 11.5px; }
    .cluster-header.salmon { background: #96473F; }
    .cluster-header.blue { background: #4B6B94; }
    .cluster-header.green { background: #4D6D47; }
    .cluster-header.gold { background: #B98A3C; }
    .grid-2 { display: flex; gap: 14px; }
    .grid-2 > div { flex: 1; }
    .metric-card { padding: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; }
    @media print { .pdf-page { break-inside: avoid; } }
      </style>
</head>
<body>
  <!-- PAGE 1: COVER -->
  <div class="pdf-page" style="justify-content: center; text-align: center; padding-top: 60px;">
    <div style="font-size: 20px; font-weight: 900; color: #8C1814; letter-spacing: 2px; margin-bottom: 40px;">CAREERMAP</div>
    <div style="font-size: 34px; font-weight: 900; color: #8C1814; line-height: 1.1; text-transform: uppercase;">
      CAREER PSYCHOMETRIC<br>ASSESSMENT REPORT
    </div>
    <div style="margin: 24px auto; background: #F8ECE8; padding: 12px 30px; font-size: 15px; color: #2B2D33; max-width: 450px; border-radius: 6px;">
      Discover Your True Strengths and Potential.
    </div>

    <div style="margin: 50px auto; max-width: 400px; text-align: left; background: #FAF2F0; padding: 20px; border-radius: 8px; border: 1px solid #F0DDD8;">
      <div style="font-size: 13px; font-weight: 800; color: #8C1814; margin-bottom: 10px; text-transform: uppercase;">Student Information</div>
      <table style="width: 100%; font-size: 12.5px; line-height: 1.8;">
        <tr><td><strong>Name:</strong></td><td>${studentName}</td></tr>
        <tr><td><strong>Class:</strong></td><td>${studentClass}</td></tr>
        <tr><td><strong>School:</strong></td><td>${studentSchool}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${formattedDate}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${studentEmail}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${studentPhone}</td></tr>
      </table>
    </div>
    <div class="footer" style="margin-top: auto;">
      <div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div>
      <div>Page No 1</div>
    </div>
  </div>

  <!-- PAGE 2: DECLARATION -->
  <div class="pdf-page">
    <div class="header"><div class="header-name">${studentFirstName}</div><div class="header-logo">CAREERMAP</div></div>
    <div class="pill-title">DECLARATION</div>
    <p><strong>Dear ${studentFirstName},</strong></p>
    <p>Thank you for choosing CareerMap for your Career Psychometric Assessment.</p>
    <p>We appreciate your trust in our assessment process and recognize the importance of making informed educational and career decisions. This report has been prepared based on your responses to scientifically designed psychometric assessments and is intended to provide meaningful insights into your <strong>aptitude, personality, interests and career preferences</strong>.</p>
    <p>The recommendations and observations presented in this report are designed to help you better understand your strengths, explore suitable career pathways, and make well-informed academic and professional choices. While every effort has been made to ensure the reliability and accuracy of the assessment, this report should be considered a decision-support tool and not the sole basis for any educational or career decision.</p>
    <p>CareerMap is committed to providing evidence-based career guidance that empowers individuals to achieve their goals with confidence. We encourage you to use this report as a foundation for self-discovery and future planning. For the best outcomes, we recommend discussing the report with a certified career counsellor who can help interpret the results in the context of your aspirations, abilities, and opportunities.</p>
    <p>We sincerely thank you for placing your trust in CareerMap and wish you every success in your educational and professional journey.</p>
    <div style="margin-top: 30px;">
      <div>Best Wishes,</div>
      <div style="font-weight: 800; font-size: 14px; color: #1E232A;">Team CareerMap</div>
    </div>
    <div class="footer"><div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div><div>Page No 2</div></div>
  </div>

  <!-- PAGE 3: YOUR PROFILING -->
  <div class="pdf-page">
    <div class="header"><div class="header-name">${studentFirstName}</div><div class="header-logo">CAREERMAP</div></div>
    <div class="pill-title">YOUR PROFILING</div>
    <p>Personal profiling is the first step in career planning. It helps you understand where you are right now on your career journey and gives you a clear path forward.</p>
    <div style="background: #FAF2F0; border: 1.5px solid #F0DDD8; border-radius: 8px; padding: 14px; margin: 15px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-bottom: 12px;">
        <div style="font-weight: 800; color: #8C1814; font-size: 13px;">CURRENT STAGE OF PLANNING</div>
        <div style="display: flex; gap: 8px;">
          <span style="background: #10B98120; border: 1px solid #10B981; color: #065F46; padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 11px;">Risk level: ${yourProfiling?.riskBadge?.label || 'Low to Medium'}</span>
          <span style="background: #1E232A; color: #fff; padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 11px;">CRI: ${yourProfiling?.careerReadinessScore?.cri || 70}/100</span>
        </div>
      </div>
      <div style="font-size: 13px; font-weight: 600; color: #1E232A;">Current Status: <strong style="color: #8C1814;">${yourProfiling?.stageTrack?.currentStageName || 'Clarity'}</strong></div>
      <div style="font-size: 12px; color: #4B5563; margin-top: 6px;">${yourProfiling?.whatItMeans || 'You know what you want to do. Now you need a clear path: which subjects, which exams, and which skills.'}</div>
    </div>
    <div class="pill-title green" style="margin-top: 15px;">YOUR 5 AREAS OF PROFILING</div>
    <div style="margin-top: 10px;">
      ${(yourProfiling?.your5Areas || [
        { domainStudentFacingName: 'About Me', score: 83, stage: 'Future-Ready', stageNo: 5, meaning: 'You know yourself very well and can use this to choose your career.' },
        { domainStudentFacingName: 'Knowing About Careers', score: 58, stage: 'Exploring', stageNo: 3, meaning: 'You are finding out about different careers.' },
        { domainStudentFacingName: 'Making a Choice', score: 83, stage: 'Future-Ready', stageNo: 5, meaning: 'You are sure about your choice and it stays steady.' },
        { domainStudentFacingName: 'Knowing the Path', score: 50, stage: 'Exploring', stageNo: 3, meaning: 'You know some of the steps for the field you like.' },
        { domainStudentFacingName: 'Feeling Sure', score: 75, stage: 'Clarity', stageNo: 4, meaning: 'You feel confident about choosing your career.' },
      ]).map((area) => `
        <div style="background: #ffffff; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #1E232A; font-size: 12px;">${area.domainStudentFacingName || area.label}</strong>
            <span style="background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">Stage ${area.stageNo || 3}/5 (${area.stage || 'Exploring'})</span>
          </div>
          <div style="font-size: 11px; color: #4B5563; margin-top: 4px;">${area.meaning}</div>
        </div>
      `).join('')}
    </div>
    <div class="footer"><div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div><div>Page No 3</div></div>
  </div>

  <!-- PAGE 4: RIASEC -->
  <div class="pdf-page">
    <div class="header"><div class="header-name">${studentFirstName}</div><div class="header-logo">CAREERMAP</div></div>
    <div class="pill-title">INTEREST SCORES (RIASEC)</div>
    <p>Your Holland Profile Code is: <strong style="color: #8C1814; font-size: 14px;">${hollandCode}</strong></p>
    <p>Your interests are the areas and activities that naturally capture your attention, curiosity, and motivation.</p>
    <div style="margin-top: 15px;">
      <div class="bar-row"><div class="bar-label">Enterprising</div><div class="bar-track"><div class="bar-fill" style="width: ${interestScoreMap.E}%;"></div></div><div class="bar-val">${interestScoreMap.E}%</div></div>
      <div class="bar-row"><div class="bar-label">Conventional</div><div class="bar-track"><div class="bar-fill" style="width: ${interestScoreMap.C}%;"></div></div><div class="bar-val">${interestScoreMap.C}%</div></div>
      <div class="bar-row"><div class="bar-label">Social</div><div class="bar-track"><div class="bar-fill" style="width: ${interestScoreMap.S}%;"></div></div><div class="bar-val">${interestScoreMap.S}%</div></div>
      <div class="bar-row"><div class="bar-label">Realistic</div><div class="bar-track"><div class="bar-fill" style="width: ${interestScoreMap.R}%;"></div></div><div class="bar-val">${interestScoreMap.R}%</div></div>
      <div class="bar-row"><div class="bar-label">Investigative</div><div class="bar-track"><div class="bar-fill" style="width: ${interestScoreMap.I}%;"></div></div><div class="bar-val">${interestScoreMap.I}%</div></div>
      <div class="bar-row"><div class="bar-label">Artistic</div><div class="bar-track"><div class="bar-fill" style="width: ${interestScoreMap.A}%;"></div></div><div class="bar-val">${interestScoreMap.A}%</div></div>
    </div>
    <div class="footer"><div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div><div>Page No 4</div></div>
  </div>

  <!-- PAGE 5: PERSONALITY (OCEAN) -->
  <div class="pdf-page">
    <div class="header"><div class="header-name">${studentFirstName}</div><div class="header-logo">CAREERMAP</div></div>
    <div class="pill-title green">PERSONALITY PROFILE (BIG FIVE)</div>
    <p>Your personality is the blend of traits that shape how you think, feel, and behave in academic, work, and personal settings.</p>
    <div style="margin-top: 15px;">
      <div class="bar-row"><div class="bar-label">Emotional Stability</div><div class="bar-track"><div class="bar-fill green" style="width: ${personScoreMap.ES}%;"></div></div><div class="bar-val">${personScoreMap.ES}%</div></div>
      <div class="bar-row"><div class="bar-label">Openness</div><div class="bar-track"><div class="bar-fill green" style="width: ${personScoreMap.O}%;"></div></div><div class="bar-val">${personScoreMap.O}%</div></div>
      <div class="bar-row"><div class="bar-label">Conscientiousness</div><div class="bar-track"><div class="bar-fill green" style="width: ${personScoreMap.Cn}%;"></div></div><div class="bar-val">${personScoreMap.Cn}%</div></div>
      <div class="bar-row"><div class="bar-label">Extraversion</div><div class="bar-track"><div class="bar-fill green" style="width: ${personScoreMap.Ex}%;"></div></div><div class="bar-val">${personScoreMap.Ex}%</div></div>
      <div class="bar-row"><div class="bar-label">Agreeableness</div><div class="bar-track"><div class="bar-fill green" style="width: ${personScoreMap.Ag}%;"></div></div><div class="bar-val">${personScoreMap.Ag}%</div></div>
    </div>
    <div class="footer"><div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div><div>Page No 5</div></div>
  </div>

  <!-- PAGE 6: LEARNING STYLES & VALUES -->
  <div class="pdf-page">
    <div class="header"><div class="header-name">${studentFirstName}</div><div class="header-logo">CAREERMAP</div></div>
    <div class="pill-title lavender">LEARNING STYLES (VARK)</div>
    <div class="grid-2" style="margin-bottom: 20px;">
      <div class="metric-card"><strong>Visual:</strong> ${varkScoreMap.V}%</div>
      <div class="metric-card"><strong>Auditory:</strong> ${varkScoreMap.A}%</div>
      <div class="metric-card"><strong>Reading/Writing:</strong> ${varkScoreMap.Rd}%</div>
      <div class="metric-card"><strong>Kinesthetic:</strong> ${varkScoreMap.K}%</div>
    </div>

    <div class="pill-title green">WORK VALUES (SCHWARTZ)</div>
    <div style="margin-top: 10px;">
      <div class="bar-row"><div class="bar-label">Openness to Change</div><div class="bar-track"><div class="bar-fill green" style="width: ${valScoreMap.OC}%;"></div></div><div class="bar-val">${valScoreMap.OC}%</div></div>
      <div class="bar-row"><div class="bar-label">Self-Enhancement</div><div class="bar-track"><div class="bar-fill green" style="width: ${valScoreMap.SE}%;"></div></div><div class="bar-val">${valScoreMap.SE}%</div></div>
      <div class="bar-row"><div class="bar-label">Self-Transcendence</div><div class="bar-track"><div class="bar-fill green" style="width: ${valScoreMap.ST}%;"></div></div><div class="bar-val">${valScoreMap.ST}%</div></div>
      <div class="bar-row"><div class="bar-label">Conservation</div><div class="bar-track"><div class="bar-fill green" style="width: ${valScoreMap.CO}%;"></div></div><div class="bar-val">${valScoreMap.CO}%</div></div>
    </div>

    <div class="pill-title gold" style="margin-top: 20px;">GOAL ORIENTATION</div>
    <div class="grid-2">
      <div class="metric-card"><strong>Short Term:</strong> ${shortPct}%</div>
      <div class="metric-card"><strong>Long Term:</strong> ${longPct}%</div>
    </div>
    <div class="footer"><div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div><div>Page No 6</div></div>
  </div>

  <!-- PAGE 7: APTITUDES & TOP CAREER CLUSTERS -->
  <div class="pdf-page">
    <div class="header"><div class="header-name">${studentFirstName}</div><div class="header-logo">CAREERMAP</div></div>
    <div class="pill-title">6 CORE APTITUDES</div>
    <div style="margin-bottom: 20px;">
      ${aptList.map(a => `
        <div class="bar-row">
          <div class="bar-label">${a.label} Aptitude</div>
          <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(100, (a.val / 50) * 100)}%;"></div></div>
          <div class="bar-val">${a.val}%</div>
        </div>
      `).join('')}
    </div>

    <div class="pill-title gold">TOP CAREER CLUSTER RECOMMENDATIONS</div>
    ${top5Clusters.map(c => `
      <div class="cluster-box">
        <div class="cluster-header"><span>${c.rank}. ${c.name}</span><span>${c.matchPercentage}% Match</span></div>
        <div class="cluster-body">
          <p style="margin: 0 0 6px 0;">${c.description}</p>
          <p style="margin: 0 0 6px 0; color: #4B5563;"><strong>Pathway:</strong> ${c.streams_and_pathways_india}</p>
          <div>
            ${(c.careers || []).slice(0, 8).map(career => `<span class="chip">${career}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('')}

    <div style="margin-top: 15px; padding: 14px; background: #FAF2F0; border: 1px solid #F0DDD8; border-radius: 8px;">
      <div style="font-weight: 800; font-size: 13px; color: #8C1814; text-transform: uppercase; margin-bottom: 6px;">
        About CareerMap
      </div>
      <p style="margin: 0 0 8px 0; font-size: 11px;">
        Career Map (A Unit of Identity Group) — Odisha's pioneering career counselling platform since 2016, guiding school students, graduates, and working professionals through Career Selection, Career Planning, and Career Mentorship.
      </p>
      <div style="font-size: 11px; font-weight: 700; color: #1E232A;">
        🌐 www.thecareermap.in &nbsp;|&nbsp; ✉️ careermap2016@gmail.com &nbsp;|&nbsp; 📞 +91 94372 08179
      </div>
    </div>
    <div class="footer"><div>📞 +91 94372 08179 | ✉️ careermap2016@gmail.com</div><div>Page No 6</div></div>
  </div>
  ${extraPages}
</body>
</html>
  `;
}



export { generateReportHtml };
function loadScriptOnce(src, globalCheck) {
  return new Promise((resolve, reject) => {
    if (globalCheck()) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
export default function AssessmentReportScreen() {
  const { attemptId } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [pageModalVisible, setPageModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const scrollViewRef = useRef(null);
  const pageOffsets = useRef({});
  const pageHeights = useRef({});
  const contentRef = useRef(null);
  const contentSize = useRef({ width: 0, height: 0 });
  const pageRefs = useRef({});
const { width: windowWidth } = useWindowDimensions();
// Design canvas = A4 at 96dpi. The phone only scales it down visually.
const PAGE_W = 794;
const PAGE_H = 1123;
const PAGE_GAP = 24;
const cardWidth = PAGE_W;
const cardHeight = PAGE_H;
const viewScale = Math.min(1, (windowWidth - 24) / PAGE_W);
const totalH = 32 * (PAGE_H + PAGE_GAP);
  const recordPageLayout = (pageNum, e) => {
    pageOffsets.current[pageNum] = e.nativeEvent.layout.y;
    pageHeights.current[pageNum] = e.nativeEvent.layout.height;
  };
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      if (attemptId && attemptId !== 'demo') {
        const data = await getAttemptResult(attemptId);
        if (
          data &&
          (data.report ||
            data.data?.report ||
            data.topCareerCluster ||
            data.data?.topCareerCluster)
        ) {
          setReportData(data.data || data);
        } else {
          setReportData(null);
        }
      } else {
        setReportData(null);
      }
    } catch (err) {
      console.warn('Could not fetch remote result:', err?.message);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const scrollToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setPageModalVisible(false);
  const targetY = (pageOffsets.current[pageNumber] ?? 0) * viewScale;   scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - 60), animated: true });
  };

  const [printing, setPrinting] = useState(false);

  // Normalize API data with rich defaults matching User Portal
  const rawData = reportData || {};
  const report = rawData.report || {};
  const student = report.student || {};
  const studentName = student.name || rawData.studentName || user?.name || 'Aryaman Singh';
  const studentFirstName = studentName.split(' ')[0] || 'Aryaman';
  const studentClass = student.class || rawData.className || user?.selectedClass || '10th';
  const studentSchool = student.school || rawData.school || user?.school || 'DAV, Pokhariput, BBSR';
  const yourProfiling = report.yourProfiling || rawData.yourProfiling || rawData.report?.yourProfiling || SAMPLE_PROFILING_REPORT;
  const studentEmail = student.email || rawData.email || user?.email || 'aryaman1012@gmail.com';
  const studentPhone = student.phone || rawData.phone || user?.mobile || '+91-88958 12485';
  const completedDate = student.completedAt || rawData.completedAt || '2025-11-26T10:00:00.000Z';

  const formattedDate = new Date(completedDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hollandCode = rawData.hollandCode || report.hollandProfile?.code || 'ECS';
  const scores = rawData.scores || {};
  const domains = report.domains || {};

  // Goal Orientation
  const goalObj = domains.goalOrientation || {};
  const longPct = goalObj.longTerm?.percentage ?? (scores.goalLong != null ? pct(scores.goalLong) : 80);
  const shortPct = goalObj.shortTerm?.percentage ?? (scores.goalShort != null ? pct(scores.goalShort) : 100);

  // Interests Scores (RIASEC)
  const interestScoreMap = { E: 100, C: 95, S: 85, R: 80, I: 55, A: 55 };
  const domainInterests = domains.interests || [];
  domainInterests.forEach((d) => {
    if (d.facet && (d.percentage != null || d.score != null)) {
      interestScoreMap[d.facet] = d.percentage ?? pct(d.score);
    }
  });

  // Personality Scores (OCEAN)
  const personScoreMap = { ES: 75, O: 63, Cn: 50, Ex: 50, Ag: 46 };
  const domainPerson = domains.personality || [];
  domainPerson.forEach((d) => {
    if (d.facet && (d.percentage != null || d.score != null)) {
      personScoreMap[d.facet] = d.percentage ?? pct(d.score);
    }
  });

  // Work Values Scores (Schwartz)
  const valScoreMap = { OC: 100, SE: 95, ST: 60, CO: 56 };
  const domainValues = domains.values || [];
  domainValues.forEach((d) => {
    if (d.facet && (d.percentage != null || d.score != null)) {
      valScoreMap[d.facet] = d.percentage ?? pct(d.score);
    }
  });

  // Learning Styles Scores (VARK)
  const varkScoreMap = { V: 100, Rd: 85, A: 75, K: 60 };
  const domainVark = domains.learningStyles || [];
  domainVark.forEach((d) => {
    if (d.facet && (d.percentage != null || d.score != null)) {
      varkScoreMap[d.facet] = d.percentage ?? pct(d.score);
    }
  });

  // Aptitude Scores (6 Core)
  const aptScoreMap = { Verb: 43, Log: 33, Voc: 33, Mech: 33, Spat: 15, Num: 14 };
  const domainApt = domains.aptitudes || [];
  domainApt.forEach((d) => {
    if (d.facet && (d.percentage != null || d.score != null)) {
      aptScoreMap[d.facet] = d.percentage ?? pct(d.score);
    }
  });

  const aptList = [
    { key: 'Num', label: 'Numerical', val: aptScoreMap.Num },
    { key: 'Log', label: 'Logical', val: aptScoreMap.Log },
    { key: 'Verb', label: 'Verbal', val: aptScoreMap.Verb },
    { key: 'Voc', label: 'Vocabulary', val: aptScoreMap.Voc },
    { key: 'Mech', label: 'Mechanical', val: aptScoreMap.Mech },
    { key: 'Spat', label: 'Spatial', val: aptScoreMap.Spat },
  ];

  const maxAptScore = Math.max(...aptList.map((a) => a.val || 0), 50);
  const aptScaleMax = maxAptScore > 50 ? 100 : 50;
  const aptYAxisPoints = aptScaleMax === 100 ? [100, 80, 60, 40, 20, 0] : [50, 40, 30, 20, 10, 0];

  // These summary callouts must always reflect the result for this attempt.  Keep
  // the display labels separate from the API facets so the backend can return its
  // compact scoring keys (for example, "Rd" or "OC").
  const rankDomainFacets = (items, definitions, fallbackScores = {}) => definitions
    .map(({ facet, label }) => {
      const apiItem = items.find((item) => item?.facet === facet);
      const rawScore = apiItem?.percentage ?? apiItem?.score;
      return {
        facet,
        label,
        score: rawScore != null ? pct(rawScore) : (fallbackScores[facet] ?? 0),
      };
    })
    .sort((a, b) => b.score - a.score);

    const MIN_SCORE = 45; // change this number to change the cut-off
  // Only items ABOVE MIN_SCORE. If none pass, show the single highest one.
  const aboveMin = (list) => {
    const passed = list.filter((item) => item.score > MIN_SCORE);
    return passed.length ? passed : list.slice(0, 1);
  };

  const topInterests = aboveMin(rankDomainFacets(domainInterests, [
    { facet: 'R', label: 'REALISTIC' },
    { facet: 'I', label: 'INVESTIGATIVE' },
    { facet: 'A', label: 'ARTISTIC' },
    { facet: 'S', label: 'SOCIAL' },
    { facet: 'E', label: 'ENTERPRISING' },
    { facet: 'C', label: 'CONVENTIONAL' },
  ], interestScoreMap));

  const topLearningStyles = aboveMin(rankDomainFacets(domainVark, [
    { facet: 'V', label: 'VISUAL' },
    { facet: 'A', label: 'AUDITORY' },
    { facet: 'Rd', label: 'READING / WRITING' },
    { facet: 'K', label: 'KINAESTHETIC' },
  ], varkScoreMap));

  const topWorkValues = aboveMin(rankDomainFacets(domainValues, [
    { facet: 'OC', label: 'OPENNESS TO CHANGE' },
    { facet: 'SE', label: 'SELF-ENHANCEMENT' },
    { facet: 'ST', label: 'SELF-TRANSCENDENCE' },
    { facet: 'CO', label: 'CONSERVATION' },
  ], valScoreMap));

  const topAptitudes = aboveMin(rankDomainFacets(domainApt, [
    { facet: 'Num', label: 'NUMERICAL APTITUDE' },
    { facet: 'Log', label: 'LOGICAL APTITUDE' },
    { facet: 'Verb', label: 'VERBAL APTITUDE' },
    { facet: 'Voc', label: 'VOCABULARY APTITUDE' },
    { facet: 'Mech', label: 'MECHANICAL APTITUDE' },
    { facet: 'Spat', label: 'SPATIAL APTITUDE' },
  ], aptScoreMap).filter((item) => item.score > 0));

  // Personality: only the single highest trait
  const topPersonalityTraits = rankDomainFacets(domainPerson, [
    { facet: 'ES', label: 'EMOTIONAL STABILITY' },
    { facet: 'O', label: 'OPENNESS' },
    { facet: 'Cn', label: 'CONSCIENTIOUSNESS' },
    { facet: 'Ex', label: 'EXTRAVERSION' },
    { facet: 'Ag', label: 'AGREEABLENESS' },
  ], personScoreMap).slice(0, 1);
  const topPersonalityTrait = topPersonalityTraits[0];

  const personalityNotes = {
    ES: 'Emotional Stability is the positive side of the Neuroticism scale — a higher score means you stay calmer under pressure.',
    O: 'Openness reflects curiosity and willingness to try new ideas — a higher score means you enjoy variety, creativity and fresh approaches.',
    Cn: 'Conscientiousness reflects discipline and reliability — a higher score means you plan ahead, stay organised and finish what you start.',
    Ex: 'Extraversion reflects your social energy — a higher score means you feel energised around people and are comfortable in groups.',
    Ag: 'Agreeableness reflects warmth and cooperation — a higher score means you are empathetic, trusting and good at teamwork.',
  };

  // Goal orientation: only the higher one
  const goalOrientationLabel = shortPct >= longPct ? 'SHORT TERM' : 'LONG TERM';
  const goalOrientationSummary = shortPct >= longPct ? 'Short-Term Achiever' : 'Long-Term Visionary';
const bandLabelFor = (arr, facet, fallback = 'Moderate') => {
  const found = (arr || []).find((x) => x.facet === facet);
  return (found?.bandLabel || fallback).toUpperCase();
};
  // 5 Top Fallback clusters matching the PDF
  const defaultTop5 = [
    {
      rank: 1,
      code: 'BIZ',
      name: 'BUSINESS & ENTREPRENEURSHIP',
      matchPercentage: 67,
      description:
        'Careers that build and run organisations — marketing, sales, operations, HR, startups and entrepreneurship.',
      why_fit:
        "You like leading, persuading and organising people and resources, and you're energised by goals, competition and building something of your own.",
      streams_and_pathways_india:
        'Commerce or any stream. Pathways: BBA (IPMAT/CUET), B.Com, entrepreneurship cells & competitions in school/college, MBA later.',
      careers: [
        'Marketing Manager',
        'Operations Manager',
        'Sales Manager',
        'Supply Chain Manager',
        'E-commerce Manager',
        'Retail Manager',
        'Office Administrator/HR Admin',
        'Business Analyst',
        'Import-Export Manager',
        'Human Resource (HR) Manager',
      ],
    },
    {
      rank: 2,
      code: 'HSP',
      name: 'HOSPITALITY',
      matchPercentage: 65,
      description:
        "Careers that create great experiences for guests — hotels, food, travel, aviation service and events. You're energetic with people, gracious under pressure, and you enjoy organising experiences others will remember.",
      why_fit:
        "You're energetic with people, gracious under pressure, and you enjoy organising experiences others will remember.",
      streams_and_pathways_india:
        'Any stream. Pathways: NCHM JEE for hotel management, culinary institutes, aviation/cabin crew training after Class 12, event management degrees.',
      careers: [
        'Hotel/Resort Manager',
        'Tour/Travel Consultant',
        'Baker',
        'Human Resource (HR) Manager',
        'Bartender',
        'Butler',
        'Cabin Crew (Air Hostess/Flight Steward)',
        'Tour Guide',
        'Cruise Manager',
        'Front Office/Guest Relations/Housekeeping Manager',
        'Restaurant/Cloud Kitchen /Catering Manager',
      ],
    },
    {
      rank: 3,
      code: 'SPT',
      name: 'SPORTS & ATHLETICS',
      matchPercentage: 65,
      description:
        "Careers in and around the game — playing, coaching, sports science, analysis and sports media. You're physically driven and competitive, you train with discipline, and you perform best when the pressure is highest.",
      why_fit:
        "You're physically driven and competitive, you train with discipline, and you perform best when the pressure is highest.",
      streams_and_pathways_india:
        'Any stream. Pathways: sports quotas and academies, B.P.Ed / physical education, sports science degrees, SAI schemes; for sports media/analytics combine with mass comm or data skills.',
      careers: [
        'Professional Athlete & Coach',
        'Professional Player',
        'Sports Nutritionist',
        'Physical Education Teacher',
        'Sports Physiotherapist',
        'Armed Forces Sports Instructor',
        'Sports Psychologist',
        'Umpire',
        'Referee',
        'Sports Coach/Trainer',
      ],
    },
    {
      rank: 4,
      code: 'GOV',
      name: 'GOVERNMENT, LAW & PUBLIC POLICY',
      matchPercentage: 63,
      description:
        "Careers that run the country and uphold the law — civil services, law, judiciary, policy and regulation. You're disciplined and dutiful, strong in language and reasoning, and you respect systems — with the ambition to serve and lead within them.",
      why_fit:
        "You're disciplined and dutiful, strong in language and reasoning, and you respect systems — with the ambition to serve and lead within them.",
      streams_and_pathways_india:
        'Any stream. Pathways: sports quotas and academies, B.P.Ed / physical education, sports science degrees, SAI schemes; for sports media/analytics combine with mass comm or data skills.',
      careers: [
        'Rural Development Officer',
        'Banker',
        'BMC Officer',
        'Passport Officer',
        'BDO',
        'Tahasildar',
        'Food Safety Officer',
        'DEO',
        'Cyber Crime Officer',
        'Civil Servant (IAS, IPS, IFS) / Bureaucrat',
      ],
    },
    {
      rank: 5,
      code: 'PSF',
      name: 'PERSONAL SERVICES & FREELANCE',
      matchPercentage: 62,
      description:
        'Careers built on personal skill and client relationships — fitness, styling, coaching, wellness, freelancing. You connect easily one-on-one, you have a sense of style or wellbeing you love sharing, and independence matters to you.',
      why_fit:
        'You connect easily one-on-one, you have a sense of style or wellbeing you love sharing, and independence matters to you.',
      streams_and_pathways_india:
        'Any stream. Pathways: certified courses (fitness, cosmetology, yoga — e.g., YCB), apprenticeships with professionals, building a client portfolio early.',
      careers: [
        'Fashion Stylist',
        'Image Consultant',
        'Life Coach',
        'Fitness/Personal Trainer',
        'Yoga/Zumba/Aerobics Instructor',
        'Nutrition Coach',
        'Career Coach',
        'Personal Assistant/Executive',
        'Spa/Massage Therapist',
        'Cosmetologist (Hair stylist/Makeup Artist/Nail Artist)',
      ],
    },
  ];

  const rawTop5 = report.careerClusters?.top5 || rawData.top5Clusters || [];
  const clusterMap = (CLUSTERS || []).reduce((acc, c) => {
    acc[c.cluster_id] = c;
    acc[c.name] = c;
    return acc;
  }, {});

  const top5Clusters = Array.from({ length: 5 }, (_, idx) => {
          const fallback = defaultTop5[idx];
          const item = rawTop5[idx] || {};
          const code = item.code || item.cluster_id || item.clusterId || fallback.code;
          const meta =
            clusterMap[code] || clusterMap[item.name || item.cluster] || CLUSTERS[idx % CLUSTERS.length] || {};
          return {
            rank: idx + 1,
            code,
            name: (item.name || item.cluster || meta.name || fallback.name).toUpperCase(),
            matchPercentage: item.matchPercentage ?? item.match ?? item.percentage ?? fallback.matchPercentage,
            description: item.description || meta.description || fallback.description,
            why_fit: item.why_fit || item.whyFit || meta.why_fit || fallback.why_fit,
            streams_and_pathways_india: item.streams_and_pathways_india || item.pathway || meta.streams_and_pathways_india || fallback.streams_and_pathways_india,
            careers: Array.isArray(item.careers) && item.careers.length > 0 ? item.careers.slice(0, 10) : (meta.careers && meta.careers.length > 0 ? meta.careers.slice(0, 10) : fallback.careers),
          };
        });

  // Injects print CSS for Web to guarantee pixel-perfect A4 printing matching User Portal
useEffect(() => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const styleId = 'careermap-a4-print-styles';
  let styleTag = document.getElementById(styleId);
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  styleTag.innerHTML = `
    #careermap-print-root { display: none; }
    @media print {
      @page { size: A4 portrait; margin: 0; }
      html, body {
        margin: 0 !important; padding: 0 !important;
        background: #fff !important;
        height: auto !important; overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body > *:not(#careermap-print-root) { display: none !important; }
      #careermap-print-root { display: block !important; }
      #careermap-print-root * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      /* Keep the cover's desktop-sized on-screen content compact on A4. */
      #careermap-print-root [data-report-page="1"] {
        padding: 12px 18px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(5) {
        margin-top: 6px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(6) {
        margin-top: 8px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(7) {
        margin-top: 4px !important;
        margin-bottom: 4px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(7) img {
        width: 250px !important;
        height: 190px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(8) {
        font-size: 10px !important;
        padding-bottom: 0 !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(8) > div:first-child {
        margin-bottom: 4px !important;
        padding: 3px 8px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(8) > div:first-child > div {
        margin-bottom: 0 !important;
        font-size: 9px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(8) > div:last-child {
        gap: 1px !important;
      }
      #careermap-print-root [data-report-page="1"] > div:nth-of-type(8) > div:last-child > div {
        font-size: 9px !important;
      }
      #careermap-print-root [data-report-page] { font-size: 13px !important; }
      #careermap-print-root [data-report-page] p,
      #careermap-print-root [data-report-page] [data-report-body] {
        text-align: justify !important;
      }
    }
  `;
}, []);

 const handlePrint = async () => {
  setPrinting(true);
  const cleanFilename = `CareerMap_Report_${(studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_')}`;

  try {
    // ---------- WEB: print exactly what is on screen ----------
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const src = document.getElementById('assessment-report-page-content');
      if (!src) throw new Error('Report content not found');

      const A4_W = 793; // px at 96dpi (210mm)
      const A4_H = 1122; // px at 96dpi (297mm)

      const root = document.createElement('div');
      root.id = 'careermap-print-root';
      const clone = src.cloneNode(true);
      clone.removeAttribute('id');
      clone.style.width = 'auto';
      clone.style.display = 'block';

    Array.from(clone.children).forEach((pageEl, i) => {
  const orig = src.children[i];
  if (!orig) return;
  const rect = orig.getBoundingClientRect();
  const w = rect.width || A4_W;
  const h = rect.height || A4_H;

  // Print each report page at A4 size. Scaling short pages up made the
  // exported cover look tiny compared with the intended compact layout.
  const zoom = Math.min(A4_W / w, A4_H / h, 1);
  pageEl.style.width = `${A4_W}px`;
  pageEl.style.height = `${A4_H}px`;
  pageEl.style.minHeight = `${A4_H}px`;
  pageEl.style.zoom = String(zoom);
  pageEl.setAttribute('data-report-page', String(i + 1));

  pageEl.style.margin = '0';
  pageEl.style.boxShadow = 'none';
  pageEl.style.borderRadius = '0';
  pageEl.style.breakAfter = 'page';
  pageEl.style.pageBreakAfter = 'always';
  pageEl.style.breakInside = 'avoid';
  pageEl.style.overflow = 'hidden';
  pageEl.style.boxSizing = 'border-box';

  // side padding (in page units, scaled by zoom)
  pageEl.style.setProperty('padding-left', '30px', 'important');
  pageEl.style.setProperty('padding-right', '30px', 'important');
});
      if (clone.lastElementChild) {
        clone.lastElementChild.style.breakAfter = 'auto';
        clone.lastElementChild.style.pageBreakAfter = 'auto';
      }

      root.appendChild(clone);
      document.body.appendChild(root);

      const originalTitle = document.title;
      document.title = cleanFilename;

      const cleanup = () => {
        document.title = originalTitle;
        root.remove();
        setPrinting(false);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);

      // let the browser lay out the clone (images are already cached)
      setTimeout(() => window.print(), 300);
      return;
    }

    // ---------- NATIVE: snapshot every on-screen page, print the images ----------
      // ---------- NATIVE: capture pages, build PDF, save it ----------
    const images = [];
    for (let i = 1; i <= 32; i++) {
      const ref = pageRefs.current[i];
      if (!ref) continue;
      const b64 = await captureRef(ref, {
        format: 'jpg',
        quality: 0.7,
        result: 'base64',
        width: 827,
        height: 1170,
      });
      images.push(b64);
    }

    const html = `
      <html><head><meta charset="utf-8" />
      <style>
        @page { size: 210mm 297mm; margin: 0; }
        html, body { margin: 0; padding: 0; }
        .p { width: 210mm; height: 297mm; overflow: hidden;
             page-break-after: always; break-after: page; }
        .p:last-child { page-break-after: auto; break-after: auto; }
        .p img { display: block; width: 100%; height: 100%; }
      </style></head><body>
      ${images.map((b) => `<div class="p"><img src="data:image/jpeg;base64,${b}" /></div>`).join('')}
      </body></html>`;

    // Build the A4 PDF
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    const fileName = `${cleanFilename}.pdf`;

    try {
      if (Platform.OS === 'android') {
        // Ask where to save (e.g. Downloads), then write the file there
        const dir = await Directory.pickDirectoryAsync();
        const dest = dir.createFile(fileName, 'application/pdf');
        const bytes = await new File(uri).bytes();
        dest.write(bytes);
        Alert.alert('Saved', `${fileName} was saved to the folder you selected.`);
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
    } catch (saveErr) {
      console.warn('Save error:', saveErr);
      Alert.alert('Not saved', 'The PDF was not saved. Please try again and choose a folder.');
    }
    return;
  } catch (err) {
    console.warn('Print error:', err);
    Alert.alert('Print Error', 'Could not open print dialog. Please try again.');
  } finally {
    if (Platform.OS !== 'web') setPrinting(false);
  }
};
 const cardStyle = {
  width: PAGE_W,
  height: PAGE_H,          // was: minHeight: 700
  overflow: 'hidden',
  alignSelf: 'center',
  backgroundColor: '#ffffff',
  borderRadius: 0,         // was 6 (rounded corners turn black in the JPG capture)
  marginBottom: PAGE_GAP,
  paddingHorizontal: 40,
  paddingVertical: 32,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Poppins_400Regular',
};


  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.pageBg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.red} />
        <Text style={{ color: COLORS.dark, fontSize: 19.5, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', marginTop: 14 }}>
          Generating Career Compass Report...
        </Text>
        <Text style={{ color: COLORS.muted, fontSize: 13.8, marginTop: 4 }}>
          Synthesizing 32 pages of RIASEC, OCEAN, Schwartz Values, Aptitudes, and Pathways
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.pageBg, fontFamily: 'Poppins_400Regular' }}>
      {/* Sticky Action Bar (Hidden on Print) */}
      <View
        nativeID="report-action-bar"
        className="no-print report-action-bar"
        dataSet={{ noPrint: 'true' }}
        style={{
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: COLORS.line,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          elevation: 4,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.replace('/(drawer)/(tabs)/assessment')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
            gap: 5,
          }}
        >
          <Ionicons name="arrow-back" size={14} color={COLORS.dark} />
          <Text style={{ color: COLORS.dark, fontSize: 13.2, fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>Assessments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPageModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 12.6, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>
            Page {currentPage} of 32
          </Text>
          <Ionicons name="chevron-down" size={13} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePrint}
          disabled={printing}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: COLORS.red,
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 20,
            gap: 6,
          }}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ transform: [{ scale: 0.8 }] }} />
          ) : (
            <Ionicons name="print-outline" size={15} color="#ffffff" />
          )}
          <Text style={{ color: '#ffffff', fontSize: 13.2, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>
           {printing ? 'Saving...' : 'Save PDF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Document: Exactly 32 Pages matching User Portal */}
      <ScrollView
        style={{ fontFamily: 'Poppins_400Regular' }}
        ref={scrollViewRef}
        nativeID="assessment-report-content"
        testID="assessment-report-content"
        onContentSizeChange={(w, h) => { contentSize.current = { width: w, height: h }; }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, alignItems: 'center' }}
      >
      <View style={{ width: PAGE_W * viewScale, height: totalH * viewScale, overflow: 'hidden' }}>
<View
  ref={contentRef}
  nativeID="assessment-report-page-content"
  collapsable={false}
  style={{
    width: PAGE_W,
    alignItems: 'center',
    transform: [{ scale: viewScale }],
    transformOrigin: 'top left',
  }}
>  
{/* ============================================================
            PAGE 1: COVER PAGE
        ============================================================ */}
      <View
  ref={(el) => { pageRefs.current[1] = el; }}
  style={[cardStyle, {
    position: 'relative',
    overflow: 'hidden',
    minHeight: cardHeight,   // <-- add this
    paddingHorizontal: cardWidth > 600 ? 36 : 18,
    paddingVertical: cardWidth > 600 ? 30 : 18,
    fontSize: 13.8,
  }]}
  onLayout={(e) => recordPageLayout(1, e)}
>
          {/* Top Left Geometric Graphics */}
          <View
            style={{
              position: 'absolute',
              top: -45,
              left: -45,
              width: 100,
              height: 100,
              backgroundColor: COLORS.red,
              borderBottomRightRadius: 40,
              transform: [{ rotate: '10deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: -30,
              width: 90,
              height: 90,
              backgroundColor: '#B88884',
              borderRadius: 30,
              transform: [{ rotate: '45deg' }],
              opacity: 0.95,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 36,
              left: 60,
              width: 50,
              height: 50,
              backgroundColor: '#D6DADC',
              borderRadius: 14,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 100,
              left: 14,
              width: 50,
              height: 50,
              borderWidth: 3,
              borderColor: '#EDA757',
              borderRadius: 18,
              transform: [{ rotate: '45deg' }],
            }}
          />

          {/* Top Right Logo */}
          <View style={{ alignItems: 'flex-end', paddingTop: 2, paddingRight: 2, zIndex: 10 }}>
            <Image
              source={Logo}
              style={{ width: 110, height: 32, tintColor: COLORS.red }}
              resizeMode="contain"
            />
          </View>

          {/* Main Title Section */}
          <View style={{ marginTop: 20, alignItems: 'center', zIndex: 10 }}>
            <Text
              style={{
                fontSize: 32.2,
                fontFamily: 'Poppins_900Black', fontWeight: '900',
                color: COLORS.red,
                textAlign: 'center',
                letterSpacing: -0.5,
                lineHeight: 36.8,
                textTransform: 'uppercase',
              }}
            >
              CAREER{'\n'}PSYCHOMETRIC
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
                color: COLORS.red,
                letterSpacing: 2.5,
                marginTop: 6,
                textTransform: 'uppercase',
              }}
            >
              ASSESSMENT REPORT
            </Text>
          </View>

          {/* Full-width Warm Blush Beige Strip */}
          <View
            style={{
              marginHorizontal: -18,
              marginTop: 16,
              paddingVertical: 10,
              backgroundColor: '#F8ECE8',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Text style={{ fontSize: 15, color: '#2B2D33', textAlign: 'center', lineHeight: 20.7 }}>
              Discover Your True Strengths and Potential
            </Text>
          </View>

          {/* Center Graphic: 3D Brain Illustration */}
         {/* Center Graphic: 3D Brain Illustration */}
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
  <Image
    source={ReportImg9}
    style={{ width: cardWidth > 600 ? 340 : 250, height: cardWidth > 600 ? 280 : 190 }}
    resizeMode="contain"
  />
</View>

          {/* Bottom Left Student Info */}
          <View style={{ zIndex: 10, paddingBottom: 10 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#F6E8E4',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.6, color: COLORS.dark ,marginBottom: 10 ,marginTop: 0 }}>Student Information</Text>
            </View>
            <View style={{ gap: 3 }}>
              <Text style={{ fontSize: 13.8, color: COLORS.body }}>
                <Text style={{ color: '#4B5563' }}>Name: </Text>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>{studentName}</Text>
              </Text>
              <Text style={{ fontSize: 13.8, color: COLORS.body }}>
                <Text style={{ color: '#4B5563' }}>Class: </Text>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>{studentClass}</Text>
              </Text>
             
              <Text style={{ fontSize: 13.8, color: COLORS.body }}>
                <Text style={{ color: '#4B5563' }}>Date: </Text>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>{formattedDate}</Text>
              </Text>
              <Text style={{ fontSize: 13.8, color: COLORS.body }}>
                <Text style={{ color: '#4B5563' }}>Email Id: </Text>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>{studentEmail}</Text>
              </Text>
              <Text style={{ fontSize: 13.8, color: COLORS.body }}>
                <Text style={{ color: '#4B5563' }}>Phone No: </Text>
                <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>{studentPhone}</Text>
              </Text>
            </View>
          </View>

          {/* Bottom Right Decorative Shapes */}
    {/* Dark red base */}
<View
  style={{
    position: 'absolute',
    bottom: 0,
    right: -31,
    width: 102,
    height: 102,
    backgroundColor: '#8C1814',
    borderRadius: 29,
    transform: [{ rotate: '45deg' }],
    pointerEvents: 'none',
    zIndex: 0,
  }}
/>

{/* Translucent pink */}
<View
  style={{
    position: 'absolute',
    bottom: 34,
    right: -2,
    width: 105,
    height: 105,
    backgroundColor: 'rgba(233, 176, 174, 0.68)',
    borderRadius: 30,
    transform: [{ rotate: '45deg' }],
    pointerEvents: 'none',
    zIndex: 1,
  }}
/>

{/* Gray diamond (moved closer: right 125 → 104) */}
<View
  style={{
    position: 'absolute',
    bottom: 42,
    right: 104,
    width: 72,
    height: 72,
    backgroundColor: '#D7DADD',
    borderRadius: 18,
    transform: [{ rotate: '45deg' }],
    pointerEvents: 'none',
    zIndex: 1,
  }}
/>

{/* Orange outline diamond (moved closer: bottom 155 → 138, right 48 → 36) */}
<View
  style={{
    position: 'absolute',
    bottom: 138,
    right: 36,
    width: 84,
    height: 84,
    borderWidth: 3,
    borderColor: '#EDA757',
    borderRadius: 23,
    transform: [{ rotate: '45deg' }],
    pointerEvents: 'none',
    zIndex: 10,
  }}
/>
          
        </View>

        {/* ============================================================
            PAGE 2: DECLARATION
        ============================================================ */}
        <View
         ref={(el) => { pageRefs.current[2] = el; }}
          style={cardStyle}
          onLayout={(e) => recordPageLayout(2, e)}
        >
  <PageHeader studentFirstName={studentFirstName} />
  <TitlePill  title="DECLARATION" />

          <Text style={{ fontSize: 15.5, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark, marginBottom: 10 }}>
            Dear {studentFirstName},
          </Text>

          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 20.7 }}>
              Thank you for choosing CareerMap for your Career Psychometric Assessment.
            </Text>
            <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 20.7 }}>
              We appreciate your trust in our assessment process and recognize the importance of making informed educational and career decisions. This report has been prepared based on your responses to scientifically designed psychometric assessments and is intended to provide meaningful insights into your{' '}
              <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>
                aptitude, personality, interests and career preferences
              </Text>.
            </Text>
            <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 20.7 }}>
              The recommendations and observations presented in this report are designed to help you better understand your strengths, explore suitable career pathways, and make well-informed academic and professional choices. While every effort has been made to ensure the reliability and accuracy of the assessment, this report should be considered a decision-support tool and not the sole basis for any educational or career decision.
            </Text>
            <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 20.7 }}>
              CareerMap is committed to providing evidence-based career guidance that empowers individuals to achieve their goals with confidence. We encourage you to use this report as a foundation for self-discovery and future planning. For the best outcomes, we recommend discussing the report with a certified career counsellor who can help interpret the results in the context of your aspirations, abilities, and opportunities.
            </Text>
            <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 20.7 }}>
              We sincerely thank you for placing your trust in CareerMap and wish you every success in your educational and professional journey.
            </Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 13.2, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#4B5563' }}>Best Wishes,</Text>
            <Text style={{ fontSize: 15, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark }}>Team CareerMap</Text>
          </View>

          <PageFooter pageNum={2} />
        </View>

        {/* ============================================================
            PAGE 3: YOUR PROFILING (PERSONAL PROFILING)
        ============================================================ */}
        <YourProfilingReport
          profilingData={yourProfiling}
          studentFirstName={studentFirstName}
          PageHeader={PageHeader}
          PageFooter={PageFooter}
          TitlePill={TitlePill}
          cardStyle={cardStyle}
          pageNum={3}
          recordPageLayout={recordPageLayout}
          pageRefs={pageRefs}
        />

        {/* ============================================================
            PAGE 4: INTRODUCTION
        ============================================================ */}
        <View
           ref={(el) => { pageRefs.current[4] = el; }}
          style={cardStyle}
          onLayout={(e) => recordPageLayout(4, e)}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="INTRODUCTION" />

          <Text style={{ fontSize: 14, color: COLORS.body, lineHeight: 22, marginBottom: 14 }}>
            The report presented by Career Map outlines key observations about{' '}
            <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>{studentName}</Text>’s personality profile, career
            interests, work preferences, cognitive strengths, and future career orientation. These outcomes are
            indicative, not definitive, and must be reviewed again in subsequent counselling meetings.
            Recommendations may shift based on deeper interaction and continuous assessment.
          </Text>

          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 14 }}>
            <Image
              source={ReportImg1}
              style={{ width: '100%', height: cardWidth > 600 ? 350 : 230 }}
              resizeMode="contain"
            />
          </View>

          <PageFooter pageNum={4} />
        </View>

        {/* ============================================================
            PAGE 5: INTEREST OVERVIEW (RIASEC)
        ============================================================ */}
        <View
          ref={(el) => { pageRefs.current[5] = el; }}
          style={cardStyle}
          onLayout={(e) => recordPageLayout(5, e)}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="INTEREST" />

          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 10 }}>
            Your interests are the areas and activities that naturally capture your attention, curiosity, and motivation.
            They go beyond hobbies and point to the type of work where you will feel engaged and satisfied. The RIASEC
            model outlines six interest areas—Realistic, Investigative, Artistic, Social, Enterprising, and
            Conventional—each reflecting different strengths and preferences. Most individuals show a combination of
            these. Understanding your interest profile helps you explore careers that align with what inspires you, making
            work more enjoyable, learning more natural, and success more fulfilling.
          </Text>

          <Text style={{ textAlign: 'center', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 15, color: COLORS.dark, marginBottom: 6 }}>
            RIASEC Model
          </Text>

          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
            <Image
              source={ReportImg2}
              style={{ width: '100%', height: cardWidth > 600 ? 330 : 220 }}
              resizeMode="contain"
            />
          </View>

          <PageFooter pageNum={5} />
        </View>

        {/* ============================================================
            PAGE 6: INTEREST DETAILS (01 - 03)
        ============================================================ */}
        <View
         ref={(el) => { pageRefs.current[6] = el; }}
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[6] = e.nativeEvent.layout.y;
          }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="01"
            title="ENTERPRISING"
            color="red"
            desc="You are naturally confident, assertive, and persuasive. You enjoy leadership roles and are driven by goals, success, and influence. You're often seen as energetic, ambitious, and socially bold."
            traits="Leadership, persuasion, risk-taking, initiative."
            enjoys="Selling, managing people, public speaking, leading projects."
            environments="Fast-paced, entrepreneurial, competitive, leadership-driven."
          />

          <DetailCardRow
            num="02"
            title="CONVENTIONAL"
            color="red"
            desc="You're an organizer — you like order, accuracy, records, plans and numbers, and people can rely on you to keep things on track."
            traits="Organized, systematic, reliable, efficient, detail-oriented."
            enjoys="Managing records, organising information, maintaining schedules, accounting, clerical work, following procedures."
            environments="Structured, orderly, rule-based, organized, administrative."
          />

          <DetailCardRow
            num="03"
            title="SOCIAL"
            color="red"
            desc="You care deeply about helping others and building meaningful interpersonal relationships. You are empathetic, cooperative, and emotionally intelligent."
            traits="Caring, supportive, trustworthy, socially responsible."
            enjoys="Teaching, counselling, mentoring, serving others."
            environments="Collaborative, service-oriented, people-focused."
          />

          <PageFooter pageNum={6} />
        </View>

        {/* ============================================================
            PAGE 7: INTEREST DETAILS (04 - 06)
        ============================================================ */}
        <View
          ref={(el) => { pageRefs.current[7] = el; }}
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[7] = e.nativeEvent.layout.y;
          }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="04"
            title="REALISTIC"
            color="red"
            desc="You are action-oriented, practical, and grounded. You prefer working with your hands, tools, and tangible objects rather than abstract ideas. You find satisfaction in seeing concrete results from your efforts."
            traits="Practical, reliable, hands-on, straightforward, persistent."
            enjoys="Building, repairing, operating machinery, working outdoors."
            environments="Structured, physical, outdoorsy, task-focused."
          />

          <DetailCardRow
            num="05"
            title="INVESTIGATIVE"
            color="red"
            desc="You are curious, analytical, and intellectually driven. You enjoy exploring ideas, solving complex problems, and understanding how things work through observation, research, and critical thinking."
            traits="Analytical, curious, logical, observant, independent."
            enjoys="Research, experimentation, data analysis, solving puzzles, scientific inquiry, learning new concepts."
            environments="Research-oriented, intellectually stimulating, independent, evidence-based, problem-solving focused."
          />

          <DetailCardRow
            num="06"
            title="ARTISTIC"
            color="red"
            desc="You enjoy creative activities from time to time and appreciate originality, even if creating isn't your central passion."
            traits="Creative, imaginative, expressive, original, intuitive."
            enjoys="Drawing, writing, music, performing arts, designing, storytelling, photography."
            environments="Creative, flexible, open-minded, innovative, self-directed."
          />

          <PageFooter pageNum={7} />
        </View>

        {/* ============================================================
            PAGE 8: VISUAL REPRESENTATION (INTERESTS)
        ============================================================ */}
        <View
          style={cardStyle}
          ref={(el) => { pageRefs.current[8] = el; }}
          onLayout={(e) => {
            pageOffsets.current[8] = e.nativeEvent.layout.y;
          }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <ScoreRepBanner title="VISUAL REPRESENTATION OF YOUR SCORE" color="red" />

          {/* H-Bar Chart */}
          <View style={{ marginVertical: 12 }}>
            {[
              { label: 'Enterprising', val: interestScoreMap.E },
              { label: 'Conventional', val: interestScoreMap.C },
              { label: 'Social', val: interestScoreMap.S },
              { label: 'Realistic', val: interestScoreMap.R },
              { label: 'Investigative', val: interestScoreMap.I },
              { label: 'Artistic', val: interestScoreMap.A },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ width: 95, fontSize: 12.6, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }} numberOfLines={1}>
                  {item.label}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 18,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginHorizontal: 8,
                  }}
                >
                  <View
                    style={{
                      width: `${item.val}%`,
                      height: '100%',
                      backgroundColor: COLORS.red,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={{ width: 38, fontSize: 12.6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textAlign: 'right' }}>
                  {item.val}%
                </Text>
              </View>
            ))}

            {/* Bottom X-Axis Numbers */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 103, paddingRight: 46, marginTop: 4 }}>
              {[0, 20, 40, 60, 80, 100].map((pt) => (
                <Text key={pt} style={{ fontSize: 10.4, color: COLORS.muted, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' }}>
                  {pt}
                </Text>
              ))}
            </View>
          </View>

          {/* Top Career Interests Box */}
          <View style={{ marginTop: 24 }}>
            <ScoreRepBanner title="YOUR TOP CAREER INTERESTS ARE" color="red" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {topInterests.map((pill) => (
                <View
                  key={pill.facet}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    paddingVertical: 9,
                    backgroundColor: COLORS.red,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.6, letterSpacing: 0.5 }}>
                    {pill.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <PageFooter pageNum={8} />
        </View>

        {/* ============================================================
            PAGE 9: PERSONALITY OVERVIEW
        ============================================================ */}
        <View
          ref={(el) => { pageRefs.current[9] = el; }}
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[9] = e.nativeEvent.layout.y;
          }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="PERSONALITY" colorClass="green" />

          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 8 }}>
            Your personality is the blend of traits that shape how you think, feel, and behave. It influences how you solve
            problems, build relationships, manage stress, and respond to opportunities. The Big Five model describes
            personality through five dimensions: Openness (curiosity and creativity), Conscientiousness (discipline and
            responsibility), Extraversion (energy and sociability), Agreeableness (cooperation and empathy), and
            Emotional Stability (resilience under pressure). Each trait offers strengths, and different careers may suit
            different combinations.
          </Text>
          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 12 }}>
            For example, conscientious individuals may excel in structured roles, while those high in openness may
            thrive in creative or innovative environments. Understanding your personality helps you choose careers that
            align with your natural style and identify areas for growth, making it easier to collaborate effectively and
            feel at ease in your work.
          </Text>

          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
            <Image
              source={ReportImg3}
              style={{ width: '100%', height: 260 }}
              resizeMode="contain"
            />
          </View>

          <PageFooter pageNum={9} />
        </View>

        {/* ============================================================
            PAGE 10: PERSONALITY SUGGESTIONS
        ============================================================ */}
        <View
          ref={(el) => { pageRefs.current[10] = el; }}
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[10] = e.nativeEvent.layout.y;
          }}
        >
          <PageHeader studentFirstName={studentFirstName} />
{[
  { num: '01', facet: 'ES', name: 'EMOTIONAL STABILITY', highText: 'You stay calm and steady under pressure a major asset for high-stakes fields like defence, medicine, aviation and competitive exams.', devText: 'Pressure situations tend to affect you more than most — building calming routines before high-stakes moments (exams, interviews) can help a lot.' },
  { num: '02', facet: 'O', name: 'OPENNESS', modText: 'You balance curiosity with practicality open to new ideas, while valuing what already works.' },
  { num: '03', facet: 'Cn', name: 'CONSCIENTIOUSNESS', modText: "You're reasonably organised and dependable, finishing what matters even if some tasks slip." },
  { num: '04', facet: 'Ex', name: 'EXTRAVERSION', modText: "You're an ambivert — comfortable both in groups and working alone, adapting to what the situation needs.", devText: "You tend to recharge better alone or in small groups than in large social settings — that's a strength in focused, independent work." },
  { num: '05', facet: 'Ag', name: 'AGREEABLENESS', modText: 'You cooperate well while still holding your own views — a healthy balance for teamwork and fair decisions.' },
].map((item) => {
  const band = bandLabelFor(domainPerson, item.facet);
  const text = band === 'HIGH' && item.highText ? item.highText
    : band === 'DEVELOPING' && item.devText ? item.devText
    : item.modText || item.highText;
  return (
    <TraitCardRow key={item.num} num={item.num} name={item.name} band={band} text={text} color="green" />
  );
})}

          <PageFooter pageNum={10} />
        </View>

        {/* ============================================================
            PAGE 11: VISUAL REPRESENTATION (PERSONALITY)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[11] = e.nativeEvent.layout.y;
          }}
          ref={(el) => { pageRefs.current[11] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <ScoreRepBanner title="VISUAL REPRESENTATION OF YOUR SCORE" color="green" />

          {/* Green Bar Chart */}
          <View style={{ marginVertical: 12 }}>
            {[
              { label: 'EMOTIONAL STABILITY', val: personScoreMap.ES },
              { label: 'OPENNESS', val: personScoreMap.O },
              { label: 'CONSCIENTIOUSNESS', val: personScoreMap.Cn },
              { label: 'EXTRAVERSION', val: personScoreMap.Ex },
              { label: 'AGREEABLENESS', val: personScoreMap.Ag },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ width: 110, fontSize: 10.9, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }} numberOfLines={1}>
                  {item.label}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 18,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginHorizontal: 8,
                  }}
                >
                  <View
                    style={{
                      width: `${item.val}%`,
                      height: '100%',
                      backgroundColor: COLORS.green,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={{ width: 36, fontSize: 12.6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textAlign: 'right' }}>
                  {item.val}%
                </Text>
              </View>
            ))}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 118, paddingRight: 44, marginTop: 4 }}>
              {[0, 20, 40, 60, 80].map((pt) => (
                <Text key={pt} style={{ fontSize: 10.4, color: COLORS.muted, fontFamily: 'Poppins_600SemiBold', fontWeight: '600' }}>
                  {pt}
                </Text>
              ))}
            </View>
          </View>

          {/* Callout Box */}
          <View
            style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: '#CFE0CB',
              borderWidth: 1,
              borderColor: '#BAD0B5',
              borderRadius: 10,
            }}
          >
           <Text style={{ fontSize: 13.2, lineHeight: 19.5, color: COLORS.dark, fontFamily: 'Poppins_500Medium', fontWeight: '500' }}>
  {personalityNotes[topPersonalityTrait?.facet]}
</Text>
          </View>

          <PageFooter pageNum={11} />
        </View>

        {/* ============================================================
            PAGE 12: LEARNING STYLES OVERVIEW
        ============================================================ */}
        <View
          ref={(el) => { pageRefs.current[12] = el; }}
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[12] = e.nativeEvent.layout.y;
          }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="LEARNING STYLE" colorClass="lavender" />

          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 8 }}>
            Everyone has a preferred way of learning, and knowing your style can make studying, training, and working
            much more effective. The VARK model highlights four main preferences: Visual learners understand best
            through charts, diagrams, and images; Auditory learners grasp information by listening, discussing, and
            explaining; Reading/Writing learners prefer text, lists, and notes; and Kinesthetic learners learn by doing,
            experiencing, and applying knowledge practically.
          </Text>
          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 8 }}>
            While everyone can learn in all ways, most people have one or two stronger preferences. Recognizing your
            learning style helps you study smarter, prepare better for exams, and even choose careers that align with how
            you absorb and process information.
          </Text>
          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 12 }}>
            Knowing your learning style empowers you to adapt your strategies in school and at work, making learning
            feel more natural and less stressful.
          </Text>

          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 8 }}>
            <Image
              source={ReportImg4}
              style={{ width: '100%', height: 260 }}
              resizeMode="contain"
            />
          </View>

          <PageFooter pageNum={12} />
        </View>

        {/* ============================================================
            PAGE 13: LEARNING STYLE DETAILS (01 - 02)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[13] = e.nativeEvent.layout.y;
          }}
          ref={(el) => { pageRefs.current[13] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="01"
            title="VISUAL"
            color="lavender"
            desc="You prefer to learn via images, diagrams, flow charts, maps, symbolic representations. You benefit from seeing the structure, patterns, shapes, relationships."
            traits="Grasping spatial or structural relationships; memory aided by imagery; organising information visually."
            enjoys="Using flowcharts, infographics, videos, colorcoded notes, visual organizers, and symbolic representations to study or plan."
            environments="Learning spaces that use visual aids, presentations, digital whiteboards, concept maps, and multimedia tools — classrooms or workplaces where design, structure, and visual clarity are valued."
          />

          <DetailCardRow
            num="02"
            title="AUDITORY"
            color="lavender"
            desc="You learn through listening and speaking. Explaining ideas aloud helps you process them deeply. You benefit from discussions, storytelling, and audio recordings. You thrive in environments where oral communication is valued — such as teaching, counselling, performing, or team collaboration."
            traits="Expressive, articulate, and sensitive to tone and rhythm. You learn best through listening, discussion, and verbal explanation. You may remember information better when it’s heard rather than read."
            enjoys="Participating in group discussions, lectures, podcasts, debates, or reading aloud. You often recall not just what was said, but how it was said."
            environments="Interactive classrooms, seminars, or workplaces that encourage open conversation, brainstorming, and verbal feedback."
          />

          <PageFooter pageNum={13} />
        </View>

        {/* ============================================================
            PAGE 14: LEARNING STYLE DETAILS (03 - 04)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[14] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[14] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="03"
            title="READING/WRITING"
            color="lavender"
            desc="You learn through reading texts, writing detailed notes, and synthesizing written information. You prefer structure, definitions, glossaries, and comprehensive documents."
            traits="Methodical reader, articulate in written expression, precise in taking notes and absorbing textbooks."
            enjoys="Taking extensive notes, reading articles, writing essays, creating lists, organizing information via bullet points."
            environments="Libraries, research-driven workspaces, policy analysis, academic institutions, and settings that value thorough documentation."
          />

          <DetailCardRow
            num="04"
            title="KINAESTHETIC"
            color="lavender"
            desc="You learn through experience. Abstract ideas make sense when you can do something with them. You thrive when allowed to experiment, observe, and apply. This learning style supports success in applied fields like engineering, design, healthcare, sports, and performing arts anywhere learning connects mind and body."
            traits="Hands-on, practical, and experiential. You grasp concepts through physical movement, real-life examples, and direct engagement. You like “learning by doing” rather than only reading or listening."
            enjoys="Experiments, demonstrations, simulations, field visits, role plays, or building and testing ideas. You prefer tactile engagement and movement during learning."
            environments="Interactive, activity-based settings workshops, labs, studios, or outdoor spaces - where theory connects directly with practice."
          />

          <PageFooter pageNum={14} />
        </View>

        {/* ============================================================
            PAGE 15: VISUAL REPRESENTATION (LEARNING STYLES)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[15] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[15] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <ScoreRepBanner title="VISUAL REPRESENTATION OF YOUR SCORE" color="lavender" />

          {/* 4 Donut Gauges */}
       {/* 4 Donut Gauges — driven by varkScoreMap */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginVertical: 14, gap: 16 }}>
  {[
    { key: 'V', label: 'VISUAL', val: varkScoreMap.V, color: '#466CA3', track: '#DDE7F3', text: '#1E3A8A' },
    { key: 'A', label: 'AUDITORY', val: varkScoreMap.A, color: COLORS.green, track: '#E2EBE0', text: '#154512' },
    { key: 'Rd', label: 'READING', val: varkScoreMap.Rd, color: '#B58E2E', track: '#F3EDE0', text: '#5C450A' },
    { key: 'K', label: 'KINAESTHETIC', val: varkScoreMap.K, color: '#9A4235', track: '#F6E7E5', text: '#691811' },
  ].map((item) => (
    <View key={item.key} style={{ alignItems: 'center' }}>
      <DonutGauge percent={item.val} color={item.color} trackColor={item.track} textColor={item.text} />
      <Text style={{ marginTop: 6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.6, color: COLORS.dark }}>{item.label}</Text>
    </View>
  ))}
</View>

          {/* Best Learning Styles */}
         {/* Best Learning Styles */}
<View style={{ marginTop: 18 }}>
  <ScoreRepBanner
    title="YOUR BEST LEARNING STYLES ARE"
    color="lavender"
  />

  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      marginTop: 4,
      width: '100%',
    }}
  >
    {topLearningStyles.slice(0, 4).map((style) => (
      <View
        key={style.facet}
        style={{
          width: '23.5%',
          minHeight: 42,
          paddingHorizontal: 4,
          paddingVertical: 8,
          backgroundColor: COLORS.lavender,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
            fontSize: 10.9,
            letterSpacing: 0.2,
            textAlign: 'center',
            lineHeight: 12.6,
          }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {style.label}
        </Text>
      </View>
    ))}
  </View>
</View>

          <PageFooter pageNum={15} />
        </View>

        {/* ============================================================
            PAGE 16: WORK VALUES OVERVIEW
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[16] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[16] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="WORK VALUES" colorClass="green" />

          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 8 }}>
            Work values are the core principles and priorities that define what matters most to you in a professional
            environment. They reflect what you seek from your career — whether that is achievement, recognition,
            security, autonomy, relationships, or making a meaningful impact. Unlike interests (what you enjoy) or
            personality (how you behave), work values reveal why certain careers feel more fulfilling than others.
          </Text>
          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 10 }}>
            Understanding your work values helps you evaluate job opportunities beyond salary and title. When your work
            aligns with your values, you feel more motivated, satisfied, and committed. Identifying your core values
            early helps you make career choices that bring long-term fulfilment.
          </Text>

          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 8 }}>
            <Image
              source={ReportImg5}
              style={{ width: '100%', height: 220 }}
              resizeMode="contain"
            />
          </View>

          <Text style={{ fontSize: 12.1, color: '#4A5568', lineHeight: 17.2, marginTop: 4 }}>
            Each trait brings strengths, and different careers suit different combinations. For example, highly
            conscientious individuals may excel in structured roles, while those high in openness may thrive in
            creative or innovative environments.
          </Text>

          <PageFooter pageNum={16} />
        </View>

        {/* ============================================================
            PAGE 17: WORK VALUES SUGGESTIONS
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[17] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[17] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="HERE ARE THE SUGGESTIONS AS PER VALUES" colorClass="dark-green" />

        {[
  { num: '01', facet: 'OC', name: 'OPENNESS TO CHANGE', highText: "Freedom, creativity and new experiences drive you — you'll thrive where you can decide how you work and what you explore.", modText: 'You appreciate some freedom and variety in how you work, while still valuing a degree of structure.' },
  { num: '02', facet: 'SE', name: 'SELF-ENHANCEMENT', highText: "Achievement, success and recognition strongly drive you — you'll thrive with clear goals, competition, growth ladders and visible results.", modText: 'Achievement and recognition matter to you, alongside other motivations like stability or purpose.' },
  { num: '03', facet: 'ST', name: 'SELF-TRANSCENDENCE', modText: 'You care about fairness and helping others as part of a balanced set of motivations.' },
  { num: '04', facet: 'CO', name: 'CONSERVATION', modText: 'You value a reasonable amount of stability and order while staying flexible when things shift.', devText: "Stability and predictability aren't your main drivers — you're comfortable with change and less tied to fixed routines." },
].map((item) => {
  const band = bandLabelFor(domainValues, item.facet);
  const text = band === 'HIGH' && item.highText ? item.highText
    : band === 'DEVELOPING' && item.devText ? item.devText
    : item.modText;
  return (
    <TraitCardRow key={item.num} num={item.num} name={item.name} band={band} text={text} color="dark-green" />
  );
})}

          <PageFooter pageNum={17} />
        </View>

        {/* ============================================================
            PAGE 18: VISUAL REPRESENTATION (WORK VALUES)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[18] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[18] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <ScoreRepBanner title="VISUAL REPRESENTATION OF YOUR SCORE" color="green" />

          {/* Capsule Progress Bars */}
          <View style={{ marginVertical: 14, gap: 14 }}>
            {[
              { label: 'OPENNESS TO CHANGE', val: valScoreMap.OC, fillColor: '#46633E', trackColor: '#C8D7C4' },
              { label: 'SELF-ENHANCEMENT', val: valScoreMap.SE, fillColor: '#5279A8', trackColor: '#C4D5EB' },
              { label: 'SELF-TRANSCENDENCE', val: valScoreMap.ST, fillColor: '#6978B4', trackColor: '#CCD2E8' },
              { label: 'CONSERVATION', val: valScoreMap.CO, fillColor: '#9E7B1D', trackColor: '#F5E9CC' },
            ].map((item) => (
              <View key={item.label}>
                <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.6, color: COLORS.dark, marginBottom: 4 }}>
                  {item.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: item.trackColor,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${item.val}%`,
                        height: '100%',
                        borderRadius: 11,
                        backgroundColor: item.fillColor,
                      }}
                    />
                  </View>
                  <Text style={{ width: 44, fontSize: 15, fontFamily: 'Poppins_900Black', fontWeight: '900', color: COLORS.dark, textAlign: 'right' }}>
                    {item.val}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Best Value Fit */}
        {/* Best Value Fit */}
<View style={{ marginTop: 20 }}>
  <ScoreRepBanner
    title="YOUR BEST WORK VALUE FIT INTO"
    color="dark-green"
  />

  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      marginTop: 4,
      width: '100%',
    }}
  >
    {topWorkValues.slice(0, 4).map((value) => (
      <View
        key={value.facet}
        style={{
          width: '23.5%',
          minHeight: 42,
          paddingHorizontal: 4,
          paddingVertical: 8,
          backgroundColor: COLORS.green,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontFamily: 'Poppins_800ExtraBold', fontWeight: '800',
            fontSize: 10.4,
            letterSpacing: 0.15,
            textAlign: 'center',
            lineHeight: 12.6,
          }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value.label}
        </Text>
      </View>
    ))}
  </View>
</View>

          <PageFooter pageNum={18} />
        </View>

        {/* ============================================================
            PAGE 19: GOAL ORIENTATION (OVERVIEW & SHORT TERM)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[19] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[19] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="GOAL ORIENTATION" colorClass="gold" />

          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 8 }}>
            Goals guide your direction in studies, work, and personal growth. Your goal orientation reflects how you view
            success and what motivates you to achieve it. Some people focus on short-term goals—completing tasks, gaining
            quick skills, or achieving immediate results—while others are driven by long-term goals, such as building
            expertise, reaching leadership roles, or creating lasting impact. Both are important: short-term goals keep
            you motivated daily, while long-term goals provide vision and persistence.
          </Text>
          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 12 }}>
            Understanding your orientation helps you balance present actions with future ambitions. Knowing your goal
            orientation helps you use your energy effectively and stay aligned with your personal and career goals.
          </Text>

          <DetailCardRow
            num="01"
            title="SHORT TERM"
            color="gold"
            desc="You are oriented toward goals that can be achieved in the relatively near future, often within months to a year. You seek more immediate feedback, micromilestones, and concrete progress."
            traits="Action-oriented, results-focused, responsive, task-driven, motivated by immediate feedback."
            enjoys="Completing tasks quickly, achieving daily or weekly targets, gaining visible and prompt results."
            environments="Fast-paced workplaces with clear, measurable short-cycle goals and regular performance check-ins."
          />

          <PageFooter pageNum={19} />
        </View>

        {/* ============================================================
            PAGE 20: GOAL ORIENTATION (LONG TERM & VISUAL)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[20] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[20] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="02"
            title="LONG TERM"
            color="gold"
            desc="You are oriented toward broader, strategic, future-oriented outcomes that may take several years to achieve and often involve many steps. You hold a vision and work progressively toward it."
            traits="Vision, persistence, planning, stability, commitment."
            enjoys="Career ambition, major life objectives, mastering a field, long projects, cumulative growth."
            environments="Long-range planning, supportive structure, milestone expectations, clarity of desired destination."
          />

          {/* Comparison Strategy Cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
            <View
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                backgroundColor: '#FDF8EE',
                borderWidth: 1,
                borderColor: '#E8D39E',
              }}
            >
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: '#F5E6C3',
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 10.9, fontFamily: 'Poppins_900Black', fontWeight: '900', color: '#4D370A' }}>SHORT TERM</Text>
              </View>
              <Text style={{ fontSize: 11.5, color: '#78540B', lineHeight: 16.1 }}>
                Aim for short milestones and rewards. Match with roles needing daily targets.
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                backgroundColor: '#FDF8EE',
                borderWidth: 1,
                borderColor: '#E8D39E',
              }}
            >
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: '#F5E6C3',
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 10.9, fontFamily: 'Poppins_900Black', fontWeight: '900', color: '#4D370A' }}>LONG TERM</Text>
              </View>
              <Text style={{ fontSize: 11.5, color: '#78540B', lineHeight: 16.1 }}>
                Use Vision boards, planning tools, long-term mentorship. Ideal for research, entrepreneurship, civil
                services.
              </Text>
            </View>
          </View>

          {/* Visual Representation */}
          <View style={{ marginTop: 10 }}>
            <ScoreRepBanner title="VISUAL REPRESENTATION OF YOUR SCORE" color="gold" />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginVertical: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <DonutGauge percent={shortPct} color="#94751E" trackColor="#F3EDE0" textColor="#5C450A" />
                <Text style={{ marginTop: 4, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.1, color: '#5C450A' }}>SHORT TERM</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <DonutGauge percent={longPct} color="#94751E" trackColor="#F3EDE0" textColor="#5C450A" />
                <Text style={{ marginTop: 4, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.1, color: '#5C450A' }}>LONG TERM</Text>
              </View>
            </View>

            <View
              style={{
                marginTop: 6,
                paddingVertical: 9,
                backgroundColor: '#94721C',
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 13.2, letterSpacing: 0.5 }}>
  Most Inclined towards : {goalOrientationLabel}
</Text>
            </View>
          </View>

          <PageFooter pageNum={20} />
        </View>

        {/* ============================================================
            PAGE 21: APTITUDE (OVERVIEW)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[21] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[21] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="APTITUDE" colorClass="red" />

          <Text style={{ fontSize: 13.2, color: COLORS.body, lineHeight: 19.5, marginBottom: 6 }}>
            Your aptitude reflects your natural ability to learn, understand, and apply different skills. While
            interests show what you enjoy, aptitudes indicate what you can do well with practice. They are not fixed and
            can improve with training, but knowing your strongest aptitudes helps you identify areas where success may
            come more easily.
          </Text>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', fontSize: 13.2, color: COLORS.dark, marginBottom: 8 }}>
            In this test, we assess six types of aptitudes:
          </Text>

                   <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 6, height: 95, overflow: 'hidden' }}>
            <Image
              source={ReportImg6}
              style={{ width: '100%', height: '100%', transform: [{ scale: 1.9 }] }}
              resizeMode="contain"
            />
          </View>

          {/* 4 Summary Cards */}
          <View style={{ gap: 8, marginTop: 6 }}>
            {[
              {
                title: 'MECHANICAL APTITUDE',
                desc: 'This shows how easily you understand machines, tools, and physical systems. If strong here, you may enjoy careers in engineering, mechanics, or technology where practical problem-solving is needed.',
              },
              {
                title: 'LOGICAL APTITUDE',
                desc: 'This reflects your ability to think critically, recognize patterns, and solve problems step by step. Strong logical reasoning is valuable in coding, mathematics, law, and research careers.',
              },
              {
                title: 'VERBAL APTITUDE',
                desc: 'This measures how well you can express ideas, understand language, and communicate clearly. Strong verbal skills are useful in teaching, law, media, and leadership roles.',
              },
              {
                title: 'VOCABULARY APTITUDE',
                desc: 'This shows the strength of your word knowledge and ability to use language effectively. It supports careers that rely on reading, writing, public speaking, or persuasion.',
              },
            ].map((card) => (
              <View
                key={card.title}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.red,
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: COLORS.redLight,
                }}
              >
                <View style={{ backgroundColor: COLORS.red, paddingVertical: 4, alignItems: 'center' }}>
                  <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 11.5, letterSpacing: 0.4 }}>
                    {card.title}
                  </Text>
                </View>
                <Text style={{ padding: 8, fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>{card.desc}</Text>
              </View>
            ))}
          </View>

          <PageFooter pageNum={21} />
        </View>

        {/* ============================================================
            PAGE 22: APTITUDE (NUMERICAL & SPATIAL)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[22] = e.nativeEvent.layout.y;
          }}
          ref={(el) => { pageRefs.current[22] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <View style={{ gap: 8, marginBottom: 12 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: COLORS.red,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: COLORS.redLight,
              }}
            >
              <View style={{ backgroundColor: COLORS.red, paddingVertical: 4, alignItems: 'center' }}>
                <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 11.5, letterSpacing: 0.4 }}>
                  NUMERICAL APTITUDE
                </Text>
              </View>
              <Text style={{ padding: 8, fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>
                This measures comfort with numbers, calculations, and quantitative reasoning. It is crucial in careers
                related to finance, data science, economics, and technology.
              </Text>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: COLORS.red,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: COLORS.redLight,
              }}
            >
              <View style={{ backgroundColor: COLORS.red, paddingVertical: 4, alignItems: 'center' }}>
                <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 11.5, letterSpacing: 0.4 }}>
                  SPATIAL APTITUDE
                </Text>
              </View>
              <Text style={{ padding: 8, fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>
                This reflects your ability to imagine shapes, designs, and objects in space. Strong spatial skills are
                important for architecture, design, surgery, engineering, and visual arts.
              </Text>
            </View>
          </View>

          <DetailCardRow
            num="01"
            title="NUMERICAL"
            color="red"
            desc="You think in structured, analytical ways and are comfortable dealing with quantities, formulas, and logic. You enjoy the clarity that numbers provide and are skilled at identifying relationships and trends in data."
            traits="Logical, detail-oriented, and comfortable working with numbers and quantitative data. Strong in mathematical reasoning, pattern recognition, and data interpretation."
            enjoys="Working with statistics, solving quantitative problems, budgeting, coding, logical puzzles, or analyzing data."
            environments="Finance, data analysis, research, science, engineering, or technology-driven spaces that rely on precision and logic."
          />

          <PageFooter pageNum={22} />
        </View>

        {/* ============================================================
            PAGE 23: APTITUDE DETAILS (LOGICAL & VERBAL)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[23] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[23] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="02"
            title="LOGICAL REASONING"
            color="red"
            desc="You have a natural ability to think clearly, reason objectively, and identify the most logical pathway to a solution. You approach challenges methodically, preferring to understand why and how something works rather than just what happens."
            traits="Analytical, systematic, and conceptually clear thinker. You are skilled at recognizing patterns, making inferences, and drawing conclusions from abstract or structured information."
            enjoys="You enjoy situations where reasoning matters more than rote learning — for example, decoding clues, troubleshooting systems, or analyzing cause-and-effect relationships."
            environments="You thrive in spaces that reward rational thought — such as research, analytics, data science, technology, law, mathematics, or strategic planning."
          />

          <DetailCardRow
            num="03"
            title="VERBAL APTITUDE"
            color="red"
            desc="You have a strong ability to understand, interpret, and communicate ideas through language. You are comfortable processing written information and expressing thoughts clearly."
            traits="Strong comprehension, articulate expression, attention to language details, and the ability to interpret written information accurately. Skilled in reasoning with words and explaining concepts clearly."
            enjoys="Reading, writing, debating ideas, storytelling, analyzing written material, presenting ideas, or communicating information clearly to others."
            environments="Communication-focused fields such as media, journalism, education, law, marketing, public relations, and roles that involve presenting, writing, or explaining ideas."
          />

          <PageFooter pageNum={23} />
        </View>

        {/* ============================================================
            PAGE 24: APTITUDE DETAILS (VOCABULARY & MECHANICAL)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[24] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[24] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="04"
            title="VOCABULARY APTITUDE"
            color="red"
            desc="You demonstrate a strong understanding of word meanings, language nuances, and how words can be used effectively in different contexts. This aptitude helps you grasp complex ideas through language and communicate with clarity and precision."
            traits="Strong word knowledge, language awareness, comprehension of subtle differences in meaning, and the ability to use language effectively."
            enjoys="Learning new words, reading diverse material, writing, language-based quizzes or puzzles, editing content, and refining communication."
            environments="Language-rich environments such as publishing, media, education, writing, communication strategy, and roles that require strong language and articulation skills."
          />

          <DetailCardRow
            num="05"
            title="MECHANICAL APTITUDE"
            color="red"
            desc="You are able to understand how physical systems, machines, and mechanical processes work. You tend to think in practical and functional ways, recognizing how components interact and how systems operate in real-world environments."
            traits="Practical thinker, strong problem-solving ability, understanding of mechanical systems, and an interest in how machines or tools function."
            enjoys="Building, fixing, assembling, experimenting with tools or devices, understanding how machines operate, and solving practical technical problems."
            environments="Engineering workshops, manufacturing, technical industries, robotics, automotive environments, or hands-on technical fields that involve machinery and systems."
          />

          <PageFooter pageNum={24} />
        </View>

        {/* ============================================================
            PAGE 25: APTITUDE DETAILS (SPATIAL)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[25] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[25] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <DetailCardRow
            num="06"
            title="SPATIAL APTITUDE"
            color="red"
            desc="You have the ability to visualize objects, shapes, and structures in three-dimensional space. You can mentally manipulate visual information, understand patterns, and imagine how different components fit together. This aptitude supports creativity, design thinking, and structural understanding."
            traits="Strong visual imagination, pattern recognition, spatial awareness, and the ability to mentally rotate or visualize objects."
            enjoys="Situations where reasoning matters more than rote learning — for example, decoding clues, troubleshooting systems, or analyzing cause-and-effect relationships."
            environments="Design, architecture, engineering, animation, product design, construction planning, and fields that require visual thinking and spatial planning."
          />

          <PageFooter pageNum={25} />
        </View>

        {/* ============================================================
            PAGE 26: VISUAL REPRESENTATION (APTITUDE COLUMN CHART)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[26] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[26] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <ScoreRepBanner title="VISUAL REPRESENTATION OF YOUR SCORE" color="red" />

          {/* Vertical Column Chart */}
          <View style={{ marginVertical: 14 }}>
            <View style={{ height: 170, position: 'relative', borderBottomWidth: 1, borderBottomColor: '#94A3B8' }}>
              {/* Guidelines */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' }}>
                {aptYAxisPoints.map((pt, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ width: 24, textAlign: 'right', paddingRight: 4, fontSize: 10.4, color: '#64748B', fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>
                      {pt}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: pt === 0 ? '#94A3B8' : '#E2E8F0' }} />
                  </View>
                ))}
              </View>

              {/* Columns */}
              <View
                style={{
                  position: 'absolute',
                  left: 28,
                  right: 8,
                  top: 0,
                  bottom: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                {aptList.map((item) => (
                  <View key={item.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <Text style={{ fontSize: 10.9, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: '#1E293B', marginBottom: 2 }}>
                      {item.val}%
                    </Text>
                    <View
                      style={{
                        width: '65%',
                        maxWidth: 32,
                        height: `${Math.max(item.val > 0 ? 5 : 0, (item.val / aptScaleMax) * 100)}%`,
                        backgroundColor: '#963E34',
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Column Labels */}
            <View style={{ flexDirection: 'row', paddingLeft: 28, paddingRight: 8, marginTop: 6 }}>
              {aptList.map((item) => (
                <Text
                  key={item.key}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 9.8,
                    fontFamily: 'Poppins_700Bold', fontWeight: '700',
                    color: '#334155',
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ))}
            </View>
          </View>

          {/* Top Aptitude Box */}
          <View style={{ marginTop: 24 }}>
            <ScoreRepBanner title="Your Top Aptitude are" color="red" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, justifyContent: 'center' }}>
              {topAptitudes.map((aptitude) => (
                <View
                  key={aptitude.facet}
                  style={{
                    minWidth: '45%',
                    paddingVertical: 9,
                    paddingHorizontal: 8,
                    backgroundColor: COLORS.red,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 12.6, letterSpacing: 0.5 }}>
                    {aptitude.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <PageFooter pageNum={26} />
        </View>

        {/* ============================================================
            PAGE 27: INTEGRATED ANALYSIS & CLUSTER #1
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[27] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[27] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />
          <TitlePill title="INTEGRATED ANALYSIS" colorClass="gold" />

          <Text style={{ fontSize: 16.1, fontFamily: 'Poppins_900Black', fontWeight: '900', color: COLORS.dark, textTransform: 'uppercase' }}>
            YOUR TOP CLUSTERS
          </Text>
          <Text style={{ fontSize: 12.1, color: COLORS.muted, marginBottom: 8 }}>
            Each card shows what the field involves, why it suits you, how to get there, and list of careers
          </Text>

          <TopClustersMap clusters={top5Clusters} />

          <ClusterMatchCard cluster={top5Clusters[0]} colorTheme="red" showWhyFit={true} />

          <PageFooter pageNum={27} />
        </View>

        {/* ============================================================
            PAGE 28: CLUSTERS #2 & #3
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[28] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[28] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <ClusterMatchCard cluster={top5Clusters[1]} colorTheme="salmon" showWhyFit={false} />
          <ClusterMatchCard cluster={top5Clusters[2]} colorTheme="blue" showWhyFit={false} />

          <PageFooter pageNum={28} />
        </View>

        {/* ============================================================
            PAGE 29: CLUSTERS #4 & #5
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[29] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[29] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <ClusterMatchCard cluster={top5Clusters[3]} colorTheme="green" showWhyFit={false} />
          <ClusterMatchCard cluster={top5Clusters[4]} colorTheme="gold" showWhyFit={false} />

          <PageFooter pageNum={29} />
        </View>

        {/* ============================================================
            PAGE 30: STUDY & PATHWAY ADVICE
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[30] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[30] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <View style={{ backgroundColor: '#F3ECE2', borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 14.4, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', textTransform: 'uppercase', color: COLORS.dark }}>
              YOUR DIRECTION: STUDY & PATHWAY ADVICE
            </Text>
            <Text style={{ fontSize: 12.1, color: '#475569', marginTop: 2 }}>
              Turning your learning style and goal orientation into concrete next steps.
            </Text>
          </View>

         <Text style={{ fontSize: 12.6, color: '#334155' }}>
  Learning style: <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark }}>{topLearningStyles[0]?.label}</Text>
</Text>
<Text style={{ fontSize: 12.6, color: '#334155' }}>
  Goal orientation: <Text style={{ fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark }}>{goalOrientationSummary}</Text>
</Text>

          <View style={{ gap: 8 }}>
            <View>
              <Text style={{ fontSize: 12.6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textTransform: 'uppercase', marginBottom: 3 }}>
                HOW TO STUDY, BASED ON HOW YOU LEARN
              </Text>
              <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>
                • Convert chapters into mind-maps, flowcharts and labelled diagrams.{'\n'}
                • Use colour-coding for formulas, dates and key terms.{'\n'}
                • Watch good video explanations, then redraw the idea from memory.{'\n'}
                • Sit where you can clearly see the board and the teacher&apos;s demonstrations.
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 12.6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textTransform: 'uppercase', marginBottom: 3 }}>
                YOUR PATHWAY APPROACH
              </Text>
              <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>
                • You&apos;re balanced between studying further and starting work early.{'\n'}
                • A smart path: choose degree courses that include internships, apprenticeships or placement years — you
                earn experience while keeping the door open to higher studies.
              </Text>
            </View>
          </View>

          <Text style={{ fontFamily: 'Poppins_700Bold', fontWeight: '700', fontSize: 13.2, color: COLORS.dark, marginTop: 10, marginBottom: 6 }}>
            A general route from where you are now
          </Text>

          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
            <Image
              source={ReportImg8}
              style={{ width: '100%', height: 130 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ padding: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 10.9, color: '#64748B', lineHeight: 16.1 }}>
              Highlighted stops are where your current goal orientation matters most — this is a general route, not a
              fixed plan. Talk it through with a teacher, counsellor or parent before locking in big decisions.
            </Text>
          </View>

          <PageFooter pageNum={30} />
        </View>

        {/* ============================================================
            PAGE 31: YOUR COMPLETE CAREER MAP
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[31] = e.nativeEvent.layout.y;
          }}
           ref={(el) => { pageRefs.current[31] = el; }}
        >
          <PageHeader studentFirstName={studentFirstName} />

          <Text style={{ fontSize: 16.1, fontFamily: 'Poppins_900Black', fontWeight: '900', color: COLORS.dark, textTransform: 'uppercase' }}>
            YOUR COMPLETE CAREER MAP
          </Text>
          <Text style={{ fontSize: 12.1, color: COLORS.muted, marginBottom: 4 }}>
            Everything above, brought together into one summary
          </Text>

          <Text style={{ fontSize: 19.5, fontFamily: 'Poppins_900Black', fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', marginBottom: 12 }}>
            {studentName}
          </Text>

          {/* 6 Summary Metric Cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
           {[
  { label: 'HOLLAND CODE', val: hollandCode },
  { label: 'TOP CLUSTER', val: `${top5Clusters[0]?.name} (${top5Clusters[0]?.matchPercentage}%)` },
  { label: 'TOP VALUE', val: topWorkValues[0]?.label },
  { label: 'TOP TRAIT', val: topPersonalityTrait?.label },
  { label: 'LEARNING STYLE', val: topLearningStyles[0]?.label },
  { label: 'GOAL ORIENTATION', val: goalOrientationSummary },
].map((m) => (
  <View key={m.label} style={{ width: '48%', padding: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 }}>
    <Text style={{ fontSize: 9.8, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>{m.label}</Text>
    <Text style={{ fontSize: 12.6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, marginTop: 2 }} numberOfLines={2}>{m.val}</Text>
  </View>
))}
          </View>

        <Text style={{ fontSize: 12.6, color: COLORS.body, lineHeight: 18.4, marginBottom: 10 }}>
  {studentName} shows an {hollandCode} interest pattern, which combined with {topPersonalityTrait?.label?.toLowerCase()} and a strong
  pull toward {topWorkValues[0]?.label?.toLowerCase()} points most clearly toward {top5Clusters[0]?.name} ({top5Clusters[0]?.matchPercentage}% match).
  Aptitude-wise, {studentName}&apos;s strongest results are in {topAptitudes.slice(0, 2).map((a) => a.label).join(' and ')}, which support
  that direction. As a {topLearningStyles[0]?.label?.toLowerCase()} learner with a {goalOrientationSummary.toLowerCase()} approach to
  the path ahead, the study tips and route in Section 3 are the most relevant starting point.
</Text>

          {/* What to do next */}
          <View style={{ padding: 10, backgroundColor: '#E6EFF6', borderWidth: 1, borderColor: '#D2DFEB', borderRadius: 10, gap: 4, marginBottom: 8 }}>
            <Text style={{ fontSize: 12.6, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textTransform: 'uppercase' }}>
              WHAT TO DO NEXT
            </Text>
            <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>
              • Read through your top 5 clusters in Section 1 with a parent, teacher or counsellor.{'\n'}
              • Shortlist 2–3 clusters and look up their stream/subject requirements for your class.{'\n'}
              • Use the study tips in Section 3 for the next exam cycle.{'\n'}
              • Retake this assessment in 6–12 months — interests and skills develop, especially in these years.
            </Text>
          </View>

          <Text style={{ fontSize: 10.9, color: COLORS.muted, lineHeight: 16.1 }}>
            Match percentages compare clusters with each other — a lower score doesn&apos;t mean you can&apos;t succeed there,
            only that other clusters fit your current profile more naturally.
          </Text>

          <PageFooter pageNum={31} />
        </View>

        {/* ============================================================
            PAGE 32: ABOUT CAREER MAP (BACK COVER)
        ============================================================ */}
        <View
          style={cardStyle}
          onLayout={(e) => {
            pageOffsets.current[32] = e.nativeEvent.layout.y;
          }}
          ref={(el) => { pageRefs.current[32] = el; }}
        >
          {/* Header */}
          <View style={{ alignItems: 'flex-end', paddingTop: 2, paddingRight: 2, marginBottom: 6 }}>
            <Image
              source={Logo}
              style={{ width: 100, height: 28, tintColor: COLORS.red }}
              resizeMode="contain"
            />
          </View>
          <View style={{ height: 2, backgroundColor: COLORS.red, width: '100%', marginBottom: 14 }} />

          {/* Hero Banner with SVG Airplane trajectory */}
          <View style={{ position: 'relative', marginBottom: 12 }}>
            <Text style={{ fontSize: 23, fontFamily: 'Poppins_900Black', fontWeight: '900', textTransform: 'uppercase', lineHeight: 27.6 }}>
              <Text style={{ color: COLORS.dark }}>DISCOVER YOUR </Text>
              <Text style={{ color: COLORS.red }}>DIRECTION.{'\n'}</Text>
              <Text style={{ color: COLORS.dark }}>DESIGN YOUR </Text>
              <Text style={{ color: COLORS.red }}>FUTURE.</Text>
            </Text>
            <View style={{ position: 'absolute', top: 0, right: 0 }}>
              <Svg width={90} height={45} viewBox="0 0 140 80" fill="none">
                <Path d="M10 65 Q 45 10, 75 45 T 120 18" stroke={COLORS.red} strokeWidth={2.5} strokeDasharray="4 4" />
                <Circle cx={120} cy={18} r={3} fill={COLORS.red} />
              </Svg>
            </View>
          </View>

          {/* About Box */}
          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: COLORS.red,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 4,
                marginBottom: 6,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 11.5, fontFamily: 'Poppins_900Black', fontWeight: '900', textTransform: 'uppercase' }}>
                ABOUT CAREER MAP
              </Text>
            </View>
            <View style={{ padding: 10, backgroundColor: '#FAF2F0', borderWidth: 1, borderColor: '#F0DDD8', borderRadius: 8 }}>
              <Text style={{ fontSize: 12.1, color: COLORS.body, lineHeight: 17.2 }}>
                Career Map (A Unit of Identity Group) — Odisha&apos;s pioneering career counselling platform since 2016,
                guiding school students, graduates, and working professionals through Career Selection, Career Planning,
                and Career Mentorship.
              </Text>
            </View>
          </View>

          {/* Why Career Map */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13.8, fontFamily: 'Poppins_900Black', fontWeight: '900', color: COLORS.red, textTransform: 'uppercase', marginBottom: 8 }}>
              WHY CAREER MAP?
            </Text>

            {/* 2 Columns with Road Divider */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {/* Left Column */}
              <View style={{ flex: 1, gap: 6 }}>
                {[
                  { img: FeaturePsychometric, label: 'PSYCHOMETRIC-BASED COUNSELLING' },
                  { img: FeatureOnetoone, label: 'ONE-TO-ONE CAREER COUNSELLING' },
                  { img: FeatureMentorship, label: 'MULTIDIMENSIONAL STUDENT MENTORSHIP' },
                ].map((f, i) => (
                  <View
                    key={i}
                    style={{
                      padding: 6,
                      backgroundColor: '#FAF2F0',
                      borderWidth: 1,
                      borderColor: '#F0DDD8',
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Image source={f.img} style={{ width: 44, height: 32, borderRadius: 4 }} resizeMode="cover" />
                    <Text style={{ flex: 1, fontSize: 9.8, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textTransform: 'uppercase', lineHeight: 12.6 }}>
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Road Divider */}
              <View style={{ width: 10, backgroundColor: '#5A636E', borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 2, height: '90%', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'dashed' }} />
              </View>

              {/* Right Column */}
              <View style={{ flex: 1, gap: 6 }}>
                {[
                  { img: FeatureCell, label: 'CAREER COUNSELING CELL' },
                  { img: FeatureBehavioral, label: 'BEHAVIORAL & PSYCHOLOGICAL COUNSELLING' },
                  { img: FeatureDashboard, label: 'INFORMATION DASHBOARD & APP' },
                ].map((f, i) => (
                  <View
                    key={i}
                    style={{
                      padding: 6,
                      backgroundColor: '#FAF2F0',
                      borderWidth: 1,
                      borderColor: '#F0DDD8',
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Image source={f.img} style={{ width: 44, height: 32, borderRadius: 4 }} resizeMode="cover" />
                    <Text style={{ flex: 1, fontSize: 9.8, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark, textTransform: 'uppercase', lineHeight: 12.6 }}>
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Partnerships badge */}
          <View style={{ padding: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 10.9, color: '#4B5563', lineHeight: 16.1 }}>
              Career Guidance Partner to the Government of Odisha, in association with UNICEF, OSEPA & DHSE. Present
              across 10,000+ students in CBSE, ICSE & residential schools.
            </Text>
          </View>

          {/* CTA Box */}
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <View
              style={{
                width: '100%',
                paddingVertical: 9,
                backgroundColor: COLORS.red,
                borderRadius: 10,
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={{ color: '#ffffff', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', fontSize: 13.8, letterSpacing: 0.4 }}>
                Your Future Deserves More Than a Guess.
              </Text>
            </View>
            <Text style={{ fontSize: 12.1, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: '#4B5563', marginBottom: 6 }}>
              Schedule your counselling session today.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 4 }}>
              <Text style={{ fontSize: 11.5, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>🌐 www.thecareermap.in</Text>
              <Text style={{ fontSize: 11.5, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: COLORS.dark }}>✉️ careermap2016@gmail.com</Text>
            </View>
            <Text style={{ fontSize: 11.5, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark }}>
              📞 +91 94372 08179, +91 97768 08179
            </Text>
          </View>

          <PageFooter pageNum={32} />
        </View>
        </View>
        </View>
      </ScrollView>
      

      {/* Page Jump Selector Modal */}
      <Modal
        visible={pageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPageModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '75%',
              paddingTop: 16,
              paddingBottom: 24,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
              <Text style={{ fontSize: 18.4, fontFamily: 'Poppins_800ExtraBold', fontWeight: '800', color: COLORS.dark }}>Jump to Page</Text>
              <TouchableOpacity onPress={() => setPageModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
              {REPORT_PAGES.map((p) => {
                const isSelected = currentPage === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => scrollToPage(p.id)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: isSelected ? COLORS.redLight : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.red : '#E2E8F0',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14.4,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? COLORS.red : COLORS.dark,
                      }}
                    >
                      {p.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={COLORS.red} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
