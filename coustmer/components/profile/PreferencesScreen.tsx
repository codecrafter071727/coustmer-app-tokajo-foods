import { Pressable } from '@/components/common/Pressable';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthInput } from '@/components/auth/AuthInput';
import { ProfileFormLayout } from '@/components/profile/ProfileFormLayout';
import { ProfileMenuSection } from '@/components/profile/ProfileMenuSection';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { authTheme } from '@/constants/auth-theme';
import {
  usePreferences,
  useUpdateDietaryPreferences,
  useUpdateLanguagePreference,
  useUpdateNotificationPreferences,
  useUserProfile,
} from '@/lib/profile/hooks';
import type {
  DietaryPreferences,
  NotificationPreferences,
} from '@/lib/profile/types';

const SPICE_OPTIONS = ['mild', 'medium', 'hot'] as const;

export function PreferencesScreen() {
  const { data: prefs, isLoading } = usePreferences();
  const { data: profile } = useUserProfile();
  const updateNotifications = useUpdateNotificationPreferences();
  const updateDietary = useUpdateDietaryPreferences();
  const updateLanguage = useUpdateLanguagePreference();

  const [notifications, setNotifications] = useState<NotificationPreferences>({});
  const [dietary, setDietary] = useState<DietaryPreferences>({});
  const [allergiesText, setAllergiesText] = useState('');
  const [language, setLanguage] = useState('en');
  const [banner, setBanner] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);

  useEffect(() => {
    if (!prefs) return;
    setNotifications(prefs.notificationPreferences ?? {});
    setDietary(prefs.dietaryPreferences ?? {});
    setAllergiesText((prefs.dietaryPreferences?.allergies ?? []).join(', '));
  }, [prefs]);

  useEffect(() => {
    if (profile?.language) {
      setLanguage(profile.language);
    }
  }, [profile?.language]);

  const toggleNotification = (key: keyof NotificationPreferences) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDietary = (key: keyof DietaryPreferences) => {
    if (key === 'allergies' || key === 'spicePreference') return;
    setDietary((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveNotifications = () => {
    setBanner(null);
    updateNotifications.mutate(notifications, {
      onSuccess: () =>
        setBanner({ message: 'Notification preferences saved', type: 'success' }),
      onError: (error) =>
        setBanner({
          message: error instanceof Error ? error.message : 'Save failed',
          type: 'error',
        }),
    });
  };

  const saveDietary = () => {
    setBanner(null);
    const allergies = allergiesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    updateDietary.mutate({ ...dietary, allergies }, {
      onSuccess: () =>
        setBanner({ message: 'Dietary preferences saved', type: 'success' }),
      onError: (error) =>
        setBanner({
          message: error instanceof Error ? error.message : 'Save failed',
          type: 'error',
        }),
    });
  };

  const saveLanguage = () => {
    setBanner(null);
    updateLanguage.mutate(
      { language: language.trim() },
      {
        onSuccess: () =>
          setBanner({ message: 'Language preference saved', type: 'success' }),
        onError: (error) =>
          setBanner({
            message: error instanceof Error ? error.message : 'Save failed',
            type: 'error',
          }),
      }
    );
  };

  return (
    <ProfileFormLayout
      title="Preferences"
      subtitle="Notifications, dietary & language"
      banner={banner}
    >
      <ProfileMenuSection title="Notifications">
        <ToggleRow
          label="Push notifications"
          value={Boolean(notifications.pushNotifications)}
          onValueChange={() => toggleNotification('pushNotifications')}
          disabled={isLoading}
        />
        <ToggleRow
          label="SMS alerts"
          value={Boolean(notifications.smsAlerts)}
          onValueChange={() => toggleNotification('smsAlerts')}
          disabled={isLoading}
        />
        <ToggleRow
          label="Email notifications"
          value={Boolean(notifications.emailNotifications)}
          onValueChange={() => toggleNotification('emailNotifications')}
          disabled={isLoading}
        />
        <ToggleRow
          label="WhatsApp"
          value={Boolean(notifications.whatsapp)}
          onValueChange={() => toggleNotification('whatsapp')}
          disabled={isLoading}
        />
        <ToggleRow
          label="Order updates"
          value={Boolean(notifications.orderUpdates)}
          onValueChange={() => toggleNotification('orderUpdates')}
          disabled={isLoading}
        />
        <ToggleRow
          label="Offers & deals"
          value={Boolean(notifications.offers)}
          onValueChange={() => toggleNotification('offers')}
          disabled={isLoading}
        />
        <ToggleRow
          label="Cart reminders"
          value={Boolean(notifications.cartReminders)}
          onValueChange={() => toggleNotification('cartReminders')}
          disabled={isLoading}
        />
        <ToggleRow
          label="Weekly digest"
          value={Boolean(notifications.weeklyDigest)}
          onValueChange={() => toggleNotification('weeklyDigest')}
          disabled={isLoading}
        />
      </ProfileMenuSection>

      <Pressable style={styles.button} onPress={saveNotifications}>
        <Text style={styles.buttonText}>Save notifications</Text>
      </Pressable>

      <ProfileMenuSection title="Dietary">
        <ToggleRow
          label="Vegetarian"
          value={Boolean(dietary.vegetarian)}
          onValueChange={() => toggleDietary('vegetarian')}
        />
        <ToggleRow
          label="Vegan"
          value={Boolean(dietary.vegan)}
          onValueChange={() => toggleDietary('vegan')}
        />
        <ToggleRow
          label="Jain"
          value={Boolean(dietary.jain)}
          onValueChange={() => toggleDietary('jain')}
        />
        <ToggleRow
          label="Gluten free"
          value={Boolean(dietary.glutenFree)}
          onValueChange={() => toggleDietary('glutenFree')}
        />
      </ProfileMenuSection>

      <AuthInput
        label="Allergies"
        value={allergiesText}
        onChangeText={setAllergiesText}
        placeholder="nuts, soy (comma separated)"
      />

      <Text style={styles.fieldLabel}>Spice preference</Text>
      <View style={styles.chipRow}>
        {SPICE_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[
              styles.chip,
              dietary.spicePreference === option && styles.chipActive,
            ]}
            onPress={() => setDietary((prev) => ({ ...prev, spicePreference: option }))}
          >
            <Text
              style={[
                styles.chipText,
                dietary.spicePreference === option && styles.chipTextActive,
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.button} onPress={saveDietary}>
        <Text style={styles.buttonText}>Save dietary preferences</Text>
      </Pressable>

      <AuthInput
        label="Language"
        value={language}
        onChangeText={setLanguage}
        placeholder="en"
      />
      <Pressable style={styles.button} onPress={saveLanguage}>
        <Text style={styles.buttonText}>Save language</Text>
      </Pressable>
    </ProfileFormLayout>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
    backgroundColor: authTheme.brand,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  fieldLabel: {
    color: authTheme.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    backgroundColor: authTheme.card,
  },
  chipActive: {
    backgroundColor: authTheme.brand,
    borderColor: authTheme.brand,
  },
  chipText: {
    color: authTheme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
