import React from 'react';
import { StyleSheet, Text as NativeText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Page 3 is drawn on the fixed 794px A4 canvas, so web px are used 1:1 (no font enlargement here).
const Text = ({ style, ...props }) => (
  <NativeText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, StyleSheet.flatten(style) || {}]} />
);

/**
 * 5 Standard Planning Stages definition
 */
const DEFAULT_STAGES = [
  { stageNo: 1, stageCode: 'LOW_AWARENESS', stageName: 'Low awareness', description: 'Limited awareness about career possibilities, personal strengths, or the factors that influence career choices.' },
  { stageNo: 2, stageCode: 'UNCERTAIN', stageName: 'Uncertain', description: 'Aware of the need to make a career decision but uncertain about available options, suitability, or the right direction.' },
  { stageNo: 3, stageCode: 'DISCOVERING', stageName: 'Discovering', description: 'Actively researching and evaluating different career pathways, courses, opportunities, and areas of interest.' },
  { stageNo: 4, stageCode: 'DECISIVE', stageName: 'Decisive', description: 'Developing a clear understanding of career preferences, suitable pathways, and the steps required to achieve the desired goal.' },
  { stageNo: 5, stageCode: 'CAREER_READINESS', stageName: 'Career Readiness', description: 'Well-prepared with a defined career direction, realistic goals, and a strategic action plan to confidently move forward.' },
];

const DEFAULT_INTRO = 'The Current Career stage analysis is the foundation of effective career planning. It provides a clear understanding of where you currently stand in your career decision-making journey and helps identify the direction you need to take. Through this, we assess your present level of career preparedness, identify the challenges or risks that may influence your career decisions, and determine the appropriate steps for your growth and development.\n\nThe objective is to establish a clear career goal and create a structured roadmap that gradually moves you from your current stage of career planning towards an optimized, informed, and future-ready stage.';

/**
 * Domain icons & accent colors for the 5 Areas
 */
const DOMAIN_CONFIG = {
  SA: { icon: '👤', color: '#0d9488', lightBg: '#f0fdfa', border: '#ccfbf1', defaultName: 'About Me' },
  CE: { icon: '🔍', color: '#2563eb', lightBg: '#eff6ff', border: '#dbeafe', defaultName: 'Knowing About Careers' },
  DC: { icon: '🎯', color: '#7c3aed', lightBg: '#f5f3ff', border: '#ede9fe', defaultName: 'Making a Choice' },
  PP: { icon: '🗺️', color: '#d97706', lightBg: '#fffbeb', border: '#fef3c7', defaultName: 'Knowing the Path' },
  CO: { icon: '💪', color: '#059669', lightBg: '#ecfdf5', border: '#d1fae5', defaultName: 'Feeling Sure' },
};

/**
 * Color and styling for risk levels
 */
function getRiskBadgeStyle(riskBadge = {}) {
  const level = Number(riskBadge.level ?? riskBadge.baseRiskLevel ?? 2);
  const hex = riskBadge.hexColor;

  switch (level) {
    case 1:
      return {
        bg: '#ecfdf5',
        border: '#a7f3d0',
        pillBg: hex || '#10b981',
        label: riskBadge.label || 'Low',
        textColor: '#065f46',
      };
    case 2:
      return {
        bg: '#f0fdf4',
        border: '#bbf7d0',
        pillBg: hex || '#4caf50',
        label: riskBadge.label || 'Low to Medium',
        textColor: '#15803d',
      };
    case 3:
      return {
        bg: '#fffbeb',
        border: '#fde68a',
        pillBg: hex || '#f59e0b',
        label: riskBadge.label || 'Medium',
        textColor: '#b45309',
      };
    case 4:
    default:
      return {
        bg: '#fff1f2',
        border: '#fecdd3',
        pillBg: hex || '#ef4444',
        label: riskBadge.label || 'High',
        textColor: '#b91c1c',
      };
  }
}


export default function YourProfilingReport({
  profilingData = {},
  studentFirstName = 'Student',
  PageHeader,
  PageFooter,
  TitlePill,
  cardStyle,
  pageNum = 3,
  recordPageLayout,
  pageRefs,
}) {
  const pData = profilingData || {};

  // 1. Header block
  const heading = pData.heading || 'YOUR PROFILING';
  const introParagraph = DEFAULT_INTRO;

  // 2. Stage Track
  const stageTrack = pData.stageTrack || {};
  const currentStageNo = Number(stageTrack.currentStageNo || 3);
  const stages = DEFAULT_STAGES;
  const currentStageName = stages[currentStageNo - 1]?.stageName || 'Discovering';

  // 3. Risk Badge
  const riskBadge = pData.riskBadge || {
    text: 'Risk level: Low to Medium',
    label: 'Low to Medium',
    level: 2,
    hexColor: '#4CAF50',
  };
  const riskStyle = getRiskBadgeStyle(riskBadge);

  // 4. What it means
  const whatItMeans =
    pData.whatItMeans ||
    'You know what you want to do. Now you need a clear path: which subjects, which exams, and which skills.';

  // 5. Your 5 Areas
  const your5Areas =
    Array.isArray(pData.your5Areas) && pData.your5Areas.length > 0
      ? pData.your5Areas
      : [
          {
            domainCode: 'SA',
            domainStudentFacingName: 'About Me',
            score: 83,
            stage: 'Future-Ready',
            stageNo: 5,
            label: 'About Me – Future-Ready',
            meaning: 'You know yourself very well and can use this to choose your career.',
          },
          {
            domainCode: 'CE',
            domainStudentFacingName: 'Knowing About Careers',
            score: 58,
            stage: 'Exploring',
            stageNo: 3,
            label: 'Knowing About Careers – Exploring',
            meaning: 'You are finding out about different careers.',
          },
          {
            domainCode: 'DC',
            domainStudentFacingName: 'Making a Choice',
            score: 83,
            stage: 'Future-Ready',
            stageNo: 5,
            label: 'Making a Choice – Future-Ready',
            meaning: 'You are sure about your choice and it stays steady.',
          },
          {
            domainCode: 'PP',
            domainStudentFacingName: 'Knowing the Path',
            score: 50,
            stage: 'Exploring',
            stageNo: 3,
            label: 'Knowing the Path – Exploring',
            meaning: 'You know some of the steps for the field you like.',
          },
          {
            domainCode: 'CO',
            domainStudentFacingName: 'Feeling Sure',
            score: 75,
            stage: 'Clarity',
            stageNo: 4,
            label: 'Feeling Sure – Clarity',
            meaning: 'You feel confident about choosing your career.',
          },
        ];

  // 6. Career Readiness Score (CRI)
  const criObj = pData.careerReadinessScore || {};
  const criScore = Number(criObj.cri ?? 70);
  const criMaxScore = Number(criObj.maxScore ?? 100);

  // 7. Notes for You (Flags)
  const notesForYou = pData.notesForYou || {};
  const hasNotes = Boolean(
    notesForYou.hasNotes && Array.isArray(notesForYou.notes) && notesForYou.notes.length > 0
  );
  const notesList = hasNotes ? notesForYou.notes : [];

  return (
    <View
      ref={(el) => {
        if (pageRefs?.current) {
          pageRefs.current[pageNum] = el;
        }
      }}
      nativeID={`page-${pageNum}`}
      dataSet={{ reportPage: 'true' }}
      className="pdf-page report-page-a4"
      style={cardStyle}
      onLayout={(e) => {
        if (typeof recordPageLayout === 'function') {
          recordPageLayout(pageNum, e);
        }
      }}
    >
      {PageHeader && <PageHeader studentFirstName={studentFirstName} />}

      {/* web: .pdf-page-body.profiling-report-body (flex 0 0 auto, py-1, space-y-2) */}
      <View style={styles.body}>
        {/* BLOCK 1: HEADER BLOCK */}
        <View>
          {TitlePill ? (
            <TitlePill title={heading} />
          ) : (
            <View style={styles.titlePillHeader}>
              <Text style={styles.titlePillText}>{heading}</Text>
            </View>
          )}

          <Text style={styles.introParagraph}>{introParagraph}</Text>
        </View>

        {/* BLOCK 2 & 3 & 6: STAGE TRACK + RISK BADGE + CRI SCORE */}
        <LinearGradient
          colors={['#FAFCFD', '#F4F7FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stageTrackCard}
        >
          {/* Top Row: Track Title & Badges */}
          <View style={styles.stageTrackTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.lightningIconContainer}>
                <Ionicons name="flash" size={12} color="#ffffff" />
              </View>
              <Text style={styles.sectionTitle}>Your Current Career Stage</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* BLOCK 3: Risk Level Badge */}
              <View
                style={[
                  styles.pill,
                  { borderWidth: 1, backgroundColor: `${riskStyle.pillBg}18`, borderColor: `${riskStyle.pillBg}55` },
                ]}
              >
                <View style={[styles.riskDot, { backgroundColor: riskStyle.pillBg }]} />
                <Text style={[styles.pillText, { color: riskStyle.pillBg }]}>
                  {riskBadge.text || `Risk level: ${riskStyle.label}`}
                </Text>
              </View>

              {/* BLOCK 6: Career Readiness Score Mini Badge */}
              <View style={[styles.pill, { backgroundColor: '#1E232A' }]}>
                <Ionicons name="trophy" size={12} color="#fbbf24" />
                <Text style={[styles.pillText, { color: '#ffffff' }]}>
                  Career Readiness:{' '}
                  <Text style={{ color: '#fcd34d', fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' }}>{criScore}</Text>
                  /{criMaxScore}
                </Text>
              </View>
            </View>
          </View>

          {/* Visual 5-Step Horizontal Track */}
          <View style={{ paddingTop: 12, paddingBottom: 4 }}>
            <View style={styles.stageTrackContainer}>
              {/* Connected background track line */}
              <View style={styles.trackLineBg} />
              {/* Filled active track line */}
              <LinearGradient
                colors={['#0d9488', '#8C1814']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.trackLineFill,
                  {
                    width: `${Math.max(0, Math.min(100, ((currentStageNo - 1) / 4) * 100))}%`,
                  },
                ]}
              />

              {stages.map((stage, sIdx) => {
                const stepNo = stage.stageNo || sIdx + 1;
                const isCurrent =
                  stage.isCurrent ||
                  stepNo === currentStageNo ||
                  stage.stageCode === stageTrack.currentStageCode;
                const isPast = stepNo < currentStageNo;

                return (
                  <View key={stage.stageCode || sIdx} style={styles.stageNodeWrapper}>
                    {/* Circle Node (current: ring-4 ring-[#8C1814]/20, shadow-md, scale-110) */}
                    <View style={[styles.stageCircleBox, isCurrent && styles.stageCircleBoxCurrent]}>
                      {isCurrent && <View style={styles.stageCircleRing} />}
                      <View
                        style={[
                          styles.stageCircle,
                          isCurrent
                            ? styles.stageCircleCurrent
                            : isPast
                            ? styles.stageCirclePast
                            : styles.stageCircleFuture,
                        ]}
                      >
                        {isPast ? (
                          <Ionicons name="checkmark" size={10} color="#ffffff" />
                        ) : (
                          <Text
                            style={[
                              styles.stageCircleText,
                              isCurrent ? { color: '#ffffff' } : { color: '#94a3b8' },
                            ]}
                          >
                            {stepNo}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Stage Name */}
                    <Text
                      style={[
                        styles.stageNodeName,
                        isCurrent
                          ? styles.stageNodeNameCurrent
                          : isPast
                          ? styles.stageNodeNamePast
                          : styles.stageNodeNameFuture,
                      ]}
                    >
                      {stage.stageName}
                    </Text>

                    {/* Current Stage Indicator Tag */}
                    {isCurrent && (
                      <View style={styles.youAreHereBadge}>
                        <Text style={styles.youAreHereText}>You are here</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.stageDescriptions}>
            {stages.map((stage) => (
              <View key={`${stage.stageNo}-description`} style={styles.stageDescriptionItem}>
                <Text style={styles.stageDescriptionTitle}>{stage.stageNo}. {stage.stageName}</Text>
                <Text style={styles.stageDescriptionText}>{stage.description}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* BLOCK 4: WHAT IT MEANS */}
        <View style={styles.whatItMeansCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Text style={[styles.sectionTitle, { color: '#8C1814' }]}>💡</Text>
            <Text style={[styles.sectionTitle, { color: '#8C1814' }]}>What it means</Text>
          </View>
          <Text style={styles.whatItMeansBody}>{whatItMeans}</Text>
          <View style={styles.whatItMeansFooter}>
            <Text style={styles.whatItMeansFooterText}>
              Current Status:{' '}
              <Text style={{ color: '#8C1814', fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>{currentStageName}</Text>
            </Text>
            <Text style={styles.whatItMeansFooterText}>
              CRI:{' '}
              <Text style={{ color: '#1e293b', fontFamily: 'Poppins_700Bold', fontWeight: '700' }}>{criScore}/100</Text>
            </Text>
          </View>
        </View>

        {/* BLOCK 5: YOUR 5 AREAS */}
        <View>
          <View style={styles.fiveAreasHeaderRow}>
            <Text style={styles.sectionTitle}>📊</Text>
            <Text style={styles.sectionTitle}>Your 5 Areas of Personal Profiling</Text>
          </View>

          <View style={{ gap: 2.4 }}>
            {your5Areas.map((area, idx) => {
              const code = area.domainCode || Object.keys(DOMAIN_CONFIG)[idx] || 'SA';
              const cfg = DOMAIN_CONFIG[code] || DOMAIN_CONFIG.SA;
              const domainName = area.domainStudentFacingName || cfg.defaultName;
              const stageNum = Number(area.stageNo || 3);
              const stageLabel = area.stage || area.label || 'Exploring';
              const scoreVal = area.score !== undefined ? area.score : null;

              return (
                <View key={code || idx} style={styles.areaCard}>
                  {/* Top Row: Icon + Name + 5-Step Mini Bar */}
                  <View style={styles.areaTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 210 }}>
                      <Text style={{ fontSize: 14, lineHeight: 20, color: '#374151' }}>{cfg.icon}</Text>
                      <Text style={styles.areaName}>{domainName}</Text>
                    </View>

                    {/* 5-Step Mini-Progress Bar (1 to 5) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, maxWidth: 220 }}>
                      <View style={styles.miniBarContainer}>
                        {[1, 2, 3, 4, 5].map((stg) => {
                          const isFilled = stg <= stageNum;
                          return (
                            <View
                              key={stg}
                              style={[
                                styles.miniBarSegment,
                                {
                                  backgroundColor: isFilled ? cfg.color : '#E2E8F0',
                                  opacity: isFilled ? 1 : 0.6,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                      <Text style={styles.miniBarLabel}>{stageNum}/5</Text>
                    </View>
                  </View>

                  {/* Bottom Row: Meaning text */}
                  <Text style={styles.areaMeaningText}>{area.meaning}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* BLOCK 7: NOTES FOR YOU (FLAGS / GUIDANCE) */}
        {hasNotes && (
          <View style={styles.notesCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="warning" size={14} color="#d97706" />
              <Text style={[styles.sectionTitle, { color: '#78350f' }]}>Personalized Guidance & Key Observations</Text>
            </View>
            <View style={{ gap: 4 }}>
              {notesList.map((n, i) => (
                <Text key={n.flagId || i} style={styles.noteText}>
                  {!!n.flagName && (
                    <Text style={styles.flagNameBadgeText}>{` ${n.flagName} `}</Text>
                  )}
                  {!!n.flagName && '  '}
                  {n.text || n.message}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* web: .profiling-report-page .pdf-footer { margin-top: 12px } — footer sits right after the content */}
      {PageFooter && (
        <View style={{ marginTop: 12, width: '100%', flexShrink: 0 }}>
          <PageFooter pageNum={pageNum} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    width: '100%',
    paddingVertical: 4,
    gap: 8,
  },
  titlePillHeader: {
    backgroundColor: '#5B7692',
    borderRadius: 9999,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 7,
    paddingRight: 24,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  titlePillText: {
    color: '#ffffff',
    fontSize: 17.6,
    lineHeight: 26.4,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.88,
    textTransform: 'uppercase',
  },
  // web: p.page-lead-text !mb-1 whitespace-pre-line text-sm leading-[1.5] text-[#374151]
  introParagraph: {
    fontSize: 14,
    lineHeight: 21,
    color: '#374151',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    marginBottom: 4,
    textAlign: 'justify',
  },
  // web: .profiling-stage-card rounded-xl border border-[#E5E7EB] gradient, padding 6px
  stageTrackCard: {
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
  },
  stageTrackTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  lightningIconContainer: {
    backgroundColor: '#8C1814',
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // web: text-xs font-black uppercase tracking-wider text-[#1E232A]
  sectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_900Black',
    fontWeight: '900',
    color: '#1E232A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // web: inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 11,
    lineHeight: 16.5,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  stageTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  // web: absolute top-3.5 left-4 right-4 h-1 bg-[#E2E8F0] rounded-full
  trackLineBg: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 9999,
    zIndex: 0,
  },
  trackLineFill: {
    position: 'absolute',
    top: 14,
    left: 16,
    height: 4,
    borderRadius: 9999,
    zIndex: 0,
  },
  stageNodeWrapper: {
    width: '18%',
    alignItems: 'center',
    zIndex: 10,
  },
  stageCircleBox: {
    width: 28,
    height: 28,
  },
  stageCircleBoxCurrent: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stageCircleRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(140, 24, 20, 0.2)',
  },
  stageCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCircleCurrent: {
    backgroundColor: '#8C1814',
  },
  stageCirclePast: {
    backgroundColor: '#0d9488',
  },
  stageCircleFuture: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  stageCircleText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_900Black',
    fontWeight: '900',
  },
  // web: mt-1 text-[11px] leading-tight
  stageNodeName: {
    fontSize: 11,
    lineHeight: 13.75,
    marginTop: 4,
    textAlign: 'center',
  },
  stageNodeNameCurrent: {
    color: '#8C1814',
    fontFamily: 'Poppins_900Black',
    fontWeight: '900',
  },
  stageNodeNamePast: {
    color: '#1e293b',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  stageNodeNameFuture: {
    color: '#334155',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  // web: mt-0.5 rounded bg-[#8C1814] px-1.5 text-[9px] font-extrabold uppercase tracking-wider text-white
  youAreHereBadge: {
    backgroundColor: '#8C1814',
    borderRadius: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  youAreHereText: {
    color: '#ffffff',
    fontSize: 9,
    lineHeight: 13.5,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    textAlign: 'center',
  },
  // web: .profiling-stage-descriptions grid sm:grid-cols-2 border-t, mt/pt 0.25rem, gap 0.15rem 0.6rem
  stageDescriptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
    paddingTop: 4,
    rowGap: 2.4,
    columnGap: 9.6,
  },
  stageDescriptionItem: {
    width: '48.6%', // (684 - 9.6) / 2 = 337.2px of the 684px inner card width
  },
  stageDescriptionTitle: {
    color: '#1E232A',
    fontSize: 8,
    lineHeight: 9.6,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  stageDescriptionText: {
    color: '#475569',
    fontSize: 8,
    lineHeight: 9.6,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  // web: .profiling-meaning-card rounded-xl border-[#E9ECEF] bg-white, padding 5px 8px
  whatItMeansCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E9ECEF',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  // web: text-[12.5px] leading-snug text-[#2D3748] font-medium
  whatItMeansBody: {
    color: '#2D3748',
    fontSize: 12.5,
    lineHeight: 17.1875,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  // web: mt-2 pt-1.5 border-t border-slate-100 flex justify-between text-[10.5px] text-slate-700
  whatItMeansFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
    paddingTop: 6,
  },
  whatItMeansFooterText: {
    fontSize: 10.5,
    lineHeight: 15.75,
    color: '#334155',
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
  },
  fiveAreasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  // web: rounded-lg border-[#E5E7EB] bg-white, padding 5px 8px, gap-0.5
  areaCard: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    gap: 2,
  },
  areaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  areaName: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_900Black',
    fontWeight: '900',
    color: '#1E232A',
  },
  miniBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniBarSegment: {
    flex: 1,
    height: 8,
    borderRadius: 9999,
  },
  miniBarLabel: {
    fontSize: 10,
    lineHeight: 15,
    color: '#334155',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  // web: text-[11px] leading-tight text-[#4B5563] pl-6 font-medium
  areaMeaningText: {
    fontSize: 11,
    lineHeight: 13.75,
    color: '#4B5563',
    paddingLeft: 24,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  // web: .profiling-guidance rounded-xl border-amber-300 bg-amber-50/70, padding 5px 8px
  notesCard: {
    backgroundColor: 'rgba(255, 251, 235, 0.7)',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  // web: rounded bg-amber-200/90 text-amber-900 text-[10px] font-black px-1.5 mr-1.5 uppercase
  flagNameBadgeText: {
    backgroundColor: 'rgba(253, 230, 138, 0.9)',
    color: '#78350f',
    fontSize: 10,
    fontFamily: 'Poppins_900Black',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  // web: text-[10px] leading-tight text-amber-950 font-medium
  noteText: {
    color: '#451a03',
    fontSize: 10,
    lineHeight: 12.5,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
});
