import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    style={[cardStyle, { fontSize: 14, paddingVertical: 20 }]}
      onLayout={(e) => {
        if (typeof recordPageLayout === 'function') {
          recordPageLayout(pageNum, e);
        }
      }}
    >
      {PageHeader && <PageHeader studentFirstName={studentFirstName} />}

      {/* BLOCK 1: Title Pill & Intro */}
      {TitlePill ? (
        <TitlePill title={heading} colorClass="red" />
      ) : (
        <View style={styles.titlePillHeader}>
          <Text style={styles.titlePillText}>{heading}</Text>
        </View>
      )}

     {introParagraph.split('\n\n').map((p, i) => (
  <Text key={i} style={styles.introParagraph}>{p}</Text>
))}
      {/* BLOCK 2 & 3 & 6: STAGE TRACK + RISK BADGE + CRI SCORE */}
      <View style={styles.stageTrackCard}>
        {/* Top summary row: stage track title, risk badge, CRI */}
        <View style={styles.stageTrackTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <View style={styles.lightningIconContainer}>
              <Ionicons name="flash" size={13} color="#ffffff" />
            </View>
            <Text style={styles.stageTrackTitle} numberOfLines={1}>
              {stageTrack.title || 'Current Stage of Planning'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* BLOCK 3: Risk Level Badge */}
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: `${riskStyle.pillBg}15`, borderColor: `${riskStyle.pillBg}55` },
              ]}
            >
              <View style={[styles.riskDot, { backgroundColor: riskStyle.pillBg }]} />
              <Text style={[styles.riskText, { color: riskStyle.pillBg }]}>
                {riskBadge.text || `Risk level: ${riskStyle.label}`}
              </Text>
            </View>

            {/* BLOCK 6: Career Readiness Score */}
            <View style={styles.criBadge}>
              <Ionicons name="trophy" size={12} color="#fbbf24" />
              <Text style={styles.criBadgeText}>
                CRI: <Text style={{ color: '#fef08a', fontWeight: '900' }}>{criScore}</Text>/{criMaxScore}
              </Text>
            </View>
          </View>
        </View>

        {/* 5-Step Horizontal Track */}
        <View style={styles.stageTrackContainer}>
          {/* Connector Line Background */}
          <View style={styles.trackLineBg} />
          {/* Filled Connector Line */}
          <View
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
                {/* Node Circle */}
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
                    <Ionicons name="checkmark" size={12} color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.stageCircleText,
                        isCurrent
                          ? { color: '#ffffff' }
                          : isPast
                          ? { color: '#ffffff' }
                          : { color: '#94a3b8' },
                      ]}
                    >
                      {stepNo}
                    </Text>
                  )}
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
                  numberOfLines={2}
                >
                  {stage.stageName}
                </Text>

                {/* 'You are here' indicator */}
                {isCurrent && (
                  <View style={styles.youAreHereBadge}>
                    <Text style={styles.youAreHereText}>You are here</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.stageDescriptions}>
          {stages.map((stage) => (
            <View key={`${stage.stageNo}-description`} style={styles.stageDescriptionItem}>
              <Text style={styles.stageDescriptionTitle}>{stage.stageNo}. {stage.stageName}</Text>
              <Text style={styles.stageDescriptionText}>{stage.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* BLOCK 4: WHAT IT MEANS */}
      <View style={styles.whatItMeansCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 15 }}>💡</Text>
          <Text style={styles.whatItMeansTitle}>What it means</Text>
        </View>
        <Text style={styles.whatItMeansBody}>{whatItMeans}</Text>
        <View style={styles.whatItMeansFooter}>
          <Text style={styles.whatItMeansFooterText}>
            Current Status: <Text style={{ color: '#8C1814', fontWeight: '800' }}>{currentStageName}</Text>
          </Text>
          <Text style={styles.whatItMeansFooterText}>
            Career Readiness: <Text style={{ color: '#1e293b', fontWeight: '800' }}>{criScore}/100</Text>
          </Text>
        </View>
      </View>

      {/* BLOCK 5: YOUR 5 AREAS */}
      <View style={{ marginTop: 10 }}>
        <View style={styles.fiveAreasHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 15 }}>📊</Text>
            <Text style={styles.fiveAreasTitle}>Your 5 Areas of Personal Profiling</Text>
          </View>
          <Text style={styles.fiveAreasLegend}>Stages: 1 to 5</Text>
        </View>

        <View style={{ gap: 3 }}>
          {your5Areas.map((area, idx) => {
            const code = area.domainCode || Object.keys(DOMAIN_CONFIG)[idx] || 'SA';
            const cfg = DOMAIN_CONFIG[code] || DOMAIN_CONFIG.SA;
            const domainName = area.domainStudentFacingName || cfg.defaultName;
            const stageNum = Number(area.stageNo || 3);
            const stageLabel = area.stage || area.label || 'Exploring';
            const scoreVal = area.score !== undefined ? area.score : null;

            return (
              <View key={code || idx} style={styles.areaCard}>
                {/* Top Row: Icon + Name + Stage Badge + 5-Mini-Bar + Score */}
                <View style={styles.areaTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                    <Text style={{ fontSize: 15 }}>{cfg.icon}</Text>
                    <Text style={styles.areaName} numberOfLines={1}>{domainName}</Text>
                   
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {/* 5-Step Mini Bar */}
                    <View style={styles.miniBarContainer}>
                      {[1, 2, 3, 4, 5].map((stg) => {
                        const isFilled = stg <= stageNum;
                        return (
                          <View
                            key={stg}
                            style={[
                              styles.miniBarSegment,
                              {
                                backgroundColor: isFilled ? cfg.color : '#e2e8f0',
                                opacity: isFilled ? 1 : 0.5,
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

      {/* BLOCK 7: NOTES FOR YOU (If present) */}
      {hasNotes && (
        <View style={styles.notesCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="warning" size={14} color="#d97706" />
            <Text style={styles.notesTitle}>Personalized Guidance & Key Observations</Text>
          </View>
          <View style={{ gap: 4 }}>
            {notesList.map((n, i) => (
              <View key={n.flagId || i} style={styles.noteItem}>
           {!!n.flagName && (
                  <View style={styles.flagNameBadge}>
                    <Text style={styles.flagNameBadgeText}>{n.flagName}</Text>
                  </View>
                )}
                <Text style={styles.noteText}>{n.text || n.message}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {PageFooter && <PageFooter pageNum={pageNum} />}
    </View>
  );
}

const styles = StyleSheet.create({
  titlePillHeader: {
    backgroundColor: '#fbebe9',
    borderColor: '#8C1814',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  titlePillText: {
    color: '#8C1814',
    fontSize: 13.8,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  introParagraph: {
    fontSize: 12,  
    color: '#374151',
    lineHeight: 15.5,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'justify',
  },
  stageTrackCard: {
    backgroundColor: '#fafbfc',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    marginBottom: 6,
  },
  stageTrackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  lightningIconContainer: {
    backgroundColor: '#8C1814',
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTrackTitle: {
    fontSize: 12.6,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 10.9,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  criBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  criBadgeText: {
    color: '#ffffff',
    fontSize: 10.9,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  stageTrackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
    paddingTop: 12,
    paddingBottom: 4,
  },
  stageDescriptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 7,
    paddingTop: 6,
    rowGap: 5,
  },
  stageDescriptionItem: {
    width: '48.5%',
  },
  stageDescriptionTitle: {
    color: '#1e232a',
    fontSize: 8.5,
    lineHeight: 10,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  stageDescriptionText: {
    color: '#64748b',
    fontSize: 7.2,
    lineHeight: 8.6,
    fontFamily: 'Poppins_400Regular',
  },
  trackLineBg: {
    position: 'absolute',
    top: 22,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    zIndex: 0,
  },
  trackLineFill: {
    position: 'absolute',
    top: 22,
    left: 20,
    height: 3,
    backgroundColor: '#0d9488',
    borderRadius: 2,
    zIndex: 1,
  },
  stageNodeWrapper: {
    width: '19%',
    alignItems: 'center',
    zIndex: 2,
  },
  stageCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCircleCurrent: {
    backgroundColor: '#8C1814',
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  stageCirclePast: {
    backgroundColor: '#0d9488',
  },
  stageCircleFuture: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  stageCircleText: {
    fontSize: 11.5,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  stageNodeName: {
    fontSize: 10.4,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12.6,
  },
  stageNodeNameCurrent: {
    color: '#8C1814',
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  stageNodeNamePast: {
    color: '#1e293b',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  stageNodeNameFuture: {
    color: '#64748b',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  youAreHereBadge: {
    backgroundColor: '#8C1814',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
  },
  youAreHereText: {
    color: '#ffffff',
    fontSize: 8.6,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  whatItMeansCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 5,
  },
  whatItMeansTitle: {
    color: '#8C1814',
    fontSize: 12.1,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  whatItMeansBody: {
    color: '#334155',
    fontSize: 11.5,
    lineHeight: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    textAlign: 'justify',
  },
  whatItMeansFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 6,
    paddingTop: 4,
  },
  whatItMeansFooterText: {
    fontSize: 10.9,
    color: '#64748b',
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  fiveAreasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fiveAreasTitle: {
    color: '#1e293b',
    fontSize: 12.6,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fiveAreasLegend: {
    color: '#64748b',
    fontSize: 10.9,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
  },
  areaCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  areaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  areaName: {
    fontSize: 11.2,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#1e293b',
  },
  areaStageBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  areaStageBadgeText: {
    fontSize: 9.8,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  miniBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 60,
  },
  miniBarSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  miniBarLabel: {
    fontSize: 10.4,
    color: '#64748b',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'right',
  },
  scoreBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  scoreBadgeText: {
    fontSize: 10.4,
    color: '#334155',
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
  },
  areaMeaningText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 14,
    marginTop: 2,
    paddingLeft: 22,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    textAlign: 'justify',
  },
  notesCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 7,
    marginTop: 5,
  },
  notesTitle: {
    color: '#92400e',
    fontSize: 12.1,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexWrap: 'wrap',
  },
  flagNameBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  flagNameBadgeText: {
    color: '#b45309',
    fontSize: 9.8,
    fontFamily: 'Poppins_800ExtraBold',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  noteText: {
    color: '#78350f',
    fontSize: 11,
    lineHeight: 14.5,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    flex: 1,
    textAlign: 'justify',
  },
});
