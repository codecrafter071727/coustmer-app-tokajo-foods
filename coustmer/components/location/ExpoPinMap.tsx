import { MapPin } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { type Region } from "react-native-maps";

import { authTheme } from "@/constants/auth-theme";
import { fonts } from "@/constants/typography";

type ExpoPinMapProps = {
  lat: number;
  lng: number;
  onMoveEnd: (lat: number, lng: number) => void;
};

/**
 * Fallback map when Google Maps JS key is missing or fails auth.
 * Uses react-native-maps (native Google tiles on Android/iOS when configured).
 */
export function ExpoPinMap({ lat, lng, onMoveEnd }: ExpoPinMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const suppressUntil = useRef(0);

  useEffect(() => {
    suppressUntil.current = Date.now() + 600;
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      280,
    );
  }, [lat, lng]);

  const onRegionChangeComplete = (region: Region) => {
    if (Date.now() < suppressUntil.current) return;
    onMoveEnd(region.latitude, region.longitude);
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
      />
      <View style={styles.centerPin} pointerEvents="none">
        <MapPin color={authTheme.brand} size={40} fill={authTheme.brand} />
      </View>
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>Offline map mode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8eaed" },
  centerPin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -20,
    marginTop: -40,
  },
  badge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(12,15,20,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: "#fff",
  },
});
