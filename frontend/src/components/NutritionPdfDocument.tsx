import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Using standard fonts temporarily to rule out CDN issues
const fonts = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold'
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#0B1120',
    padding: 30,
    fontFamily: fonts.regular,
    color: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34D399', // accent color
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 20,
  },
  summaryBlock: {
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 20,
  },
  planName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#34D399',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 1.4,
  },
  targetText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 5,
  },
  disclaimer: {
    fontSize: 10,
    color: '#FBBF24',
    marginTop: 10,
    fontStyle: 'italic',
    padding: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderRadius: 4,
  },
  dayCard: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayNumber: {
    marginRight: 10,
    padding: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34D399',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F8FAFC',
  },
  dailyTotalsLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  mealRow: {
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 6,
  },
  mealType: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  macrosContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  macroBadge: {
    fontSize: 9,
    marginRight: 10,
  },
  cals: { color: '#34D399' },
  protein: { color: '#60A5FA' },
  carbs: { color: '#FBBF24' },
  fat: { color: '#F472B6' },

  mealInstructions: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 1.3,
  },
  dailySummaryNode: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 8,
  },
  dailySummaryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#34D399',
  },
  proteinEff: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  alternativesBox: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  altLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#10B981',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  altText: {
    fontSize: 8,
    color: '#64748B',
  }
});

interface NutritionPdfProps {
  planData: any;
}

export const NutritionPdfDocument: React.FC<NutritionPdfProps> = ({ planData }) => {
  console.log("Rendering Nutrition PDF with data:", planData?.plan_name);
  if (!planData || !planData.days) return <Document><Page><Text>No data</Text></Page></Document>;

  const renderMeal = (label: string, meal: any) => {
    if (!meal) return null;
    const m = Array.isArray(meal) ? meal[0] : meal;
    
    return (
      <View style={styles.mealRow} wrap={false}>
        <Text style={styles.mealType}>{label}</Text>
        <Text style={styles.mealName}>{m.name}</Text>
        <View style={styles.macrosContainer}>
          <Text style={[styles.macroBadge, styles.cals]}>{m.calories} Calories</Text>
          <Text style={[styles.macroBadge, styles.protein]}>Protein: {m.protein_g}g</Text>
          <Text style={[styles.macroBadge, styles.carbs]}>Carbohydrates: {m.carbs_g}g</Text>
          <Text style={[styles.macroBadge, styles.fat]}>Fats: {m.fat_g}g</Text>
        </View>
        
        <Text style={styles.proteinEff}>Efficiency: {(m.protein_per_100kcal || (m.calories > 0 ? (m.protein_g * 100) / m.calories : 0)).toFixed(1)}g / 100kcal</Text>

        {m.instructions && (
          <Text style={styles.mealInstructions}>{m.instructions}</Text>
        )}

        {m.alternatives && m.alternatives.length > 0 && (
          <View style={styles.alternativesBox}>
            <Text style={styles.altLabel}>Alternatives:</Text>
            <Text style={styles.altText}>
              {m.alternatives.map((alt: any) => alt.name || alt.exercise).join(' • ')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Nutrition Plan</Text>
        <Text style={styles.subtitle}>Generated by ArogyaMitra (AROMI)</Text>

        <View style={styles.summaryBlock}>
          <Text style={styles.planName}>{planData.plan_name}</Text>
          <Text style={styles.summaryText}>{planData.summary}</Text>
          <Text style={styles.targetText}>Target: {planData.daily_calorie_target} kcal/day</Text>
          {planData.disclaimer && (
            <Text style={styles.disclaimer}>{planData.disclaimer}</Text>
          )}
        </View>

        {planData.days.map((day: any, index: number) => (
          <View key={index} style={styles.dayCard} wrap={false}>
            <View style={styles.dayHeader}>
              <View style={styles.dayTitleContainer}>
                <Text style={styles.dayNumber}>D{day.day}</Text>
                <Text style={styles.dayName}>{day.day_name}</Text>
              </View>
              {day.daily_totals && (
                <Text style={styles.dailyTotalsLabel}>{day.daily_totals.calories} kcal total</Text>
              )}
            </View>

            {day.meals && (
              <View>
                {renderMeal("Breakfast", day.meals.breakfast)}
                {renderMeal("Lunch", day.meals.lunch)}
                {renderMeal("Dinner", day.meals.dinner)}
                {renderMeal("Snacks", day.meals.snacks)}
                
                {day.daily_totals && (
                  <View style={styles.dailySummaryNode}>
                    <Text style={styles.dailySummaryText}>
                      Daily Total: {day.daily_totals.calories} Calories · Protein: {day.daily_totals.protein_g}g · Carbohydrates: {day.daily_totals.carbs_g}g · Fats: {day.daily_totals.fat_g}g
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
};
