import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView,
  Platform,
  
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome, AntDesign } from '@expo/vector-icons';

import { AuthMessageBanner } from '@/components/auth/AuthMessageBanner';
import { authTheme } from '@/constants/auth-theme';
import { colors as appColors } from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { validateEmail, validateEmailOrPhone, validatePassword } from '@/utils/validation';

type LoginTab = 'password' | 'otp';
type FocusField = 'email' | 'password' | 'emailOrPhone' | null;

const CustomSwitch = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 12,
        backgroundColor: value ? authTheme.brand : authTheme.inputBorder,
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: value ? 18 : 0 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }}
      />
    </Pressable>
  );
};

type Props = {
  onSignUp?: () => void;
  onForgotPassword?: () => void;
  onLoginSuccess?: () => void;
  onOtpSent?: (identifier: string) => void;
};

export function LoginFormContent({ onSignUp, onForgotPassword, onLoginSuccess, onOtpSent }: Props) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [tab, setTab] = useState<LoginTab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const handlePasswordLogin = async () => {
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    setBanner(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      await login({ email: email.trim(), password });
      onLoginSuccess?.();
      router.replace('/home');
    } catch (error) {
      setBanner({ message: error instanceof Error ? error.message : 'Login failed', type: 'error' });
    }
  };

  const handleSendOtp = async () => {
    const identifierError = validateEmailOrPhone(emailOrPhone);
    setErrors({ emailOrPhone: identifierError });
    setBanner(null);
    if (identifierError) return;

    try {
      await sendOtp({ emailOrPhone: emailOrPhone.trim() });
      const identifier = emailOrPhone.trim();
      if (onOtpSent) {
        onOtpSent(identifier);
        return;
      }
      onLoginSuccess?.();
      router.push({
        pathname: '/verify-otp',
        params: { identifier },
      });
    } catch (error) {
      setBanner({ message: error instanceof Error ? error.message : 'Failed to send OTP', type: 'error' });
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
      return;
    }
    router.replace('/?auth=forgot-password');
  };

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
      return;
    }
    router.replace('/?auth=sign-up');
  };

  const inputStyle = (field: FocusField, hasError: boolean) => [
    styles.inputContainer,
    focusedField === field && styles.inputFocused,
    hasError && styles.inputError,
  ];

  const iconColor = (field: FocusField, hasError: boolean) => {
    if (hasError) return authTheme.error;
    if (focusedField === field) return authTheme.brand;
    return authTheme.textDim;
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={20} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.title}>Let's get something</Text>
        <Text style={styles.subtitle}>Good to see you back.</Text>

        <View style={styles.socialRow}>
          <View style={styles.socialCircle}>
            <AntDesign name="google" size={24} color="#DB4437" />
          </View>
          <View style={[styles.socialCircle, styles.socialCircleBrand]}>
            <FontAwesome name="facebook-f" size={20} color={appColors.facebook} />
          </View>
          <View style={[styles.socialCircle, styles.socialCircleBrand]}>
            <FontAwesome name="twitter" size={20} color="#1DA1F2" />
          </View>
        </View>

        {banner ? (
          <View style={{ marginBottom: 16 }}>
            <AuthMessageBanner message={banner.message} type={banner.type} />
          </View>
        ) : null}

        {tab === 'password' ? (
          <View>
            <View style={styles.fieldWrap}>
              <View style={inputStyle('email', Boolean(errors.email))}>
                <View style={[styles.iconCircle, focusedField === 'email' && styles.iconCircleFocused]}>
                  <Mail color={iconColor('email', Boolean(errors.email))} size={18} strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Gmail ID"
                  placeholderTextColor={authTheme.textDim}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldWrap}>
              <View style={inputStyle('password', Boolean(errors.password))}>
                <View style={[styles.iconCircle, focusedField === 'password' && styles.iconCircleFocused]}>
                  <Lock color={iconColor('password', Boolean(errors.password))} size={18} strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={authTheme.textDim}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  secureTextEntry={!showPassword}
                  underlineColorAndroid="transparent"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} style={styles.rightSlot}>
                  {showPassword ? (
                    <EyeOff color={authTheme.textMuted} size={20} />
                  ) : (
                    <Eye color={authTheme.textMuted} size={20} />
                  )}
                </Pressable>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Remember me next time</Text>
              <CustomSwitch
                value={rememberMe}
                onValueChange={setRememberMe}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handlePasswordLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>{isLoading ? '...' : 'SIGN IN'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.fieldWrap}>
              <View style={inputStyle('emailOrPhone', Boolean(errors.emailOrPhone))}>
                <View style={[styles.iconCircle, focusedField === 'emailOrPhone' && styles.iconCircleFocused]}>
                  <Phone color={iconColor('emailOrPhone', Boolean(errors.emailOrPhone))} size={18} strokeWidth={2} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email or phone"
                  placeholderTextColor={authTheme.textDim}
                  value={emailOrPhone}
                  onChangeText={(text) => {
                    setEmailOrPhone(text);
                    if (errors.emailOrPhone) setErrors((prev) => ({ ...prev, emailOrPhone: null }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                  onFocus={() => setFocusedField('emailOrPhone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.emailOrPhone ? <Text style={styles.errorText}>{errors.emailOrPhone}</Text> : null}
            </View>

            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Reminder me next time</Text>
              <CustomSwitch
                value={rememberMe}
                onValueChange={setRememberMe}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSendOtp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>{isLoading ? '...' : 'SEND OTP'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomLinks}>
          <Text style={styles.signupText}>
            Don't have account?{' '}
            <Text style={styles.signupLink} onPress={handleSignUp}>
              Sign in
            </Text>
          </Text>

          <Pressable
            onPress={() => {
              setTab(tab === 'password' ? 'otp' : 'password');
              setErrors({});
              setBanner(null);
            }}
            style={{ marginTop: 20 }}
          >
            <Text style={styles.switchTabText}>
              {tab === 'password' ? 'Use OTP Login instead' : 'Use Password Login instead'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

export const loginFormStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: authTheme.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: authTheme.textMuted,
    marginBottom: 24,
  },
  socialRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 16,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: authTheme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    shadowColor: authTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  socialCircleBrand: {
    backgroundColor: authTheme.bgSoft,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 8,
    minHeight: 56,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: authTheme.brand,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'ios'
      ? {
        shadowColor: authTheme.brand,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
      : {}),
  },
  inputError: {
    borderColor: authTheme.error,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  iconCircleFocused: {
    backgroundColor: '#FFFFFF',
  },
  rightSlot: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: authTheme.text,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fieldWrap: {
    marginBottom: 16,
    minWidth: 0,
  },
  errorText: {
    color: authTheme.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  rememberText: {
    fontSize: 14,
    color: authTheme.text,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: authTheme.brand,
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: authTheme.brandDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  submitBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bottomLinks: {
    alignItems: 'center',
  },
  signupText: {
    color: authTheme.textMuted,
    fontSize: 14,
  },
  signupLink: {
    color: authTheme.brand,
    fontWeight: '800',
  },
  switchTabText: {
    color: authTheme.textDim,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});

const styles = loginFormStyles;
