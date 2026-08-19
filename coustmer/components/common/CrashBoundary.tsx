import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { customerApi } from '@/lib/customer/api';
import { fonts } from '@/constants/typography';

type Props = { children: ReactNode };
type State = { hasError: boolean; errorMsg: string };

export class CrashBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMsg: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void customerApi.reportCrash({
      error: error.message,
      stack: error.stack ?? undefined,
      componentStack: info.componentStack ?? undefined,
      appVersion: Constants.expoConfig?.version ?? undefined,
      platform: Platform.OS,
      deviceModel: `${Platform.OS} ${Platform.Version}`,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMsg: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>{this.state.errorMsg}</Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.85}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#0B1220',
    marginBottom: 8,
    textAlign: 'center',
  },
  msg: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 300,
  },
  btn: {
    height: 44,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
