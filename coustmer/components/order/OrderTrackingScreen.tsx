import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, MoreHorizontal, MessageCircle, ChevronRight, X, Gift, Home, Edit2, CheckCircle2 } from 'lucide-react-native';
import { ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions } from 'react-native';
import Animated, { useSharedValue, withSpring, withDelay, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { useRef } from 'react';

import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { OrderStatusTimeline, type OrderStatus } from '@/components/order/OrderStatusTimeline';
import { useOrder, useOrderTracking } from '@/lib/order/hooks';
import { useCartStore } from '@/store/cart-store';
import { swiggyOrderUi as ui } from '@/constants/swiggy-order-ui';

const generateMapHtml = (coords: { latitude: number, longitude: number }[], restLat: number, restLng: number, custLat: number, custLng: number, restName: string, apiKey: string) => {
  const routeJson = JSON.stringify(coords.map(c => [c.latitude, c.longitude]));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body { padding: 0; margin: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        html, body, #map { height: 100%; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map, directionsService, directionsRenderer, scooterMarker;
        const routeCoords = ${routeJson};
        const restLat = ${restLat};
        const restLng = ${restLng};
        const custLat = ${custLat};
        const custLng = ${custLng};

        function initMap() {
          // Initialize map centered between restaurant and customer
          const center = {
            lat: (restLat + custLat) / 2,
            lng: (restLng + custLng) / 2
          };

          map = new google.maps.Map(document.getElementById('map'), {
            zoom: 14,
            center: center,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ]
          });

          // Directions service for routing
          directionsService = new google.maps.DirectionsService();
          directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#FF6B35',
              strokeOpacity: 0.9,
              strokeWeight: 5,
              geodesic: true
            }
          });

          // Restaurant marker (pot icon)
          const restaurantMarker = new google.maps.Marker({
            position: { lat: restLat, lng: restLng },
            map: map,
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#222222',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22)
            },
            label: {
              text: '${restName}',
              color: '#1C1C1C',
              fontSize: '14px',
              fontWeight: 'bold',
              className: 'marker-label'
            }
          });

          // Customer marker (house icon)
          const customerMarker = new google.maps.Marker({
            position: { lat: custLat, lng: custLng },
            map: map,
            icon: {
              path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
              fillColor: '#222222',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22)
            },
            label: {
              text: 'House',
              color: '#1C1C1C',
              fontSize: '14px',
              fontWeight: 'bold'
            }
          });

          // Scooter marker for delivery partner
          scooterMarker = new google.maps.Marker({
            position: { lat: restLat, lng: restLng },
            map: map,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><text x="20" y="30" font-size="30" text-anchor="middle">🛵</text></svg>'),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            },
            zIndex: 1000
          });

          // Get directions from restaurant to customer
          const request = {
            origin: { lat: restLat, lng: restLng },
            destination: { lat: custLat, lng: custLng },
            travelMode: google.maps.TravelMode.DRIVING
          };

          directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
              directionsRenderer.setDirections(result);
              
              // Send distance and duration to React Native
              const route = result.routes[0].legs[0];
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'ROUTE_INFO',
                  distance: route.distance.text,
                  duration: route.duration.text
                }));
              }

              // Fit bounds to show entire route with padding
              const bounds = new google.maps.LatLngBounds();
              bounds.extend({ lat: restLat, lng: restLng });
              bounds.extend({ lat: custLat, lng: custLng });
              map.fitBounds(bounds, {
                top: 100,
                bottom: 200,
                left: 50,
                right: 50
              });

              // Add a subtle shadow/outline to the route for better visibility
              const routePath = result.routes[0].overview_path;
              new google.maps.Polyline({
                path: routePath,
                geodesic: true,
                strokeColor: '#000000',
                strokeOpacity: 0.2,
                strokeWeight: 8,
                map: map,
                zIndex: 1
              });

              // Animate scooter along the route
              animateScooter(routePath);
            } else {
              console.error('Directions request failed:', status);
              // Fallback: draw a straight line if directions fail
              const fallbackPath = [
                { lat: restLat, lng: restLng },
                { lat: custLat, lng: custLng }
              ];
              new google.maps.Polyline({
                path: fallbackPath,
                geodesic: true,
                strokeColor: '#FF6B35',
                strokeOpacity: 0.7,
                strokeWeight: 5,
                map: map,
                icons: [{
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 3
                  },
                  offset: '0',
                  repeat: '20px'
                }]
              });
            }
          });

          // Listen for zoom changes
          map.addListener('zoom_changed', () => {
            const zoomLevel = map.getZoom();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ZOOM_CHANGED',
                isZoomed: zoomLevel > 14
              }));
            }
          });
        }

        // Animate scooter marker along the route
        function animateScooter(path) {
          if (!path || path.length === 0) return;
          
          let step = 0;
          const totalSteps = path.length;
          const stepDuration = 200; // ms between steps (faster movement)
          let animationFrameId;

          function moveScooter() {
            if (step < totalSteps) {
              const position = path[step];
              
              // Smooth marker movement
              scooterMarker.setPosition(position);
              
              // Calculate bearing for next step to rotate scooter icon
              if (step < totalSteps - 1) {
                const nextPosition = path[step + 1];
                const bearing = google.maps.geometry.spherical.computeHeading(position, nextPosition);
                
                // Update scooter icon with rotation
                const rotatedIcon = {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(' + bearing + 'deg)"><text x="20" y="30" font-size="30" text-anchor="middle">🛵</text></svg>'
                  ),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                };
                scooterMarker.setIcon(rotatedIcon);
              }
              
              // Pan map to follow scooter (optional - comment out if you don't want auto-follow)
              // map.panTo(position);
              
              step++;
              animationFrameId = setTimeout(moveScooter, stepDuration);
            } else {
              // Loop back to start after reaching destination
              step = 0;
              animationFrameId = setTimeout(() => {
                // Reset to restaurant position
                scooterMarker.setPosition({ lat: restLat, lng: restLng });
                // Wait a bit before starting next loop
                setTimeout(moveScooter, 3000);
              }, 2000);
            }
          }

          // Start animation after 1 second
          setTimeout(moveScooter, 1000);
          
          // Return cleanup function
          return () => {
            if (animationFrameId) clearTimeout(animationFrameId);
          };
        }
      </script>
      <script async defer
        src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initMap">
      </script>
    </body>
    </html>
  `;
};

export function OrderTrackingScreen() {
  const router = useRouter();
  const { orderId, newOrder } = useLocalSearchParams<{ orderId: string, newOrder?: string }>();
  const id = String(orderId ?? '');

  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const clearCart = useCartStore((s) => s.clearCart);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Get Google Maps API key from environment
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDtqlNuzkFM6Ix8GKcQcV06Dz6j1_FVRjo';

  useEffect(() => {
    if (newOrder === 'true') {
      const clearTimer = setTimeout(async () => {
        try {
          const { cartApi } = await import('@/lib/cart/api');
          await cartApi.clearCart();
        } catch (error) {
          console.warn(
            'Failed to clear remote cart after order:',
            error instanceof Error ? error.message : error
          );
        } finally {
          clearCart();
        }
      }, 500);

      return () => clearTimeout(clearTimer);
    }
  }, [newOrder, clearCart]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: withTiming(opacity.value === 1 ? 0 : 20, { duration: 400 }) }],
  }));

  const order = useOrder(id);
  const tracking = useOrderTracking(id, { refetchInterval: 8_000 });

  const t = tracking.data;
  const o = order.data;

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  const mapHeightPercent = useSharedValue(65);

  // Scratch card state
  const [showScratchCard, setShowScratchCard] = useState(true);

  // Route info from Google Maps
  const [distanceInfo, setDistanceInfo] = useState<{ dist: string, time: string } | null>(null);

  useEffect(() => {
    mapHeightPercent.value = withTiming(isZoomed ? 100 : 65, { duration: 500 });
  }, [isZoomed]);

  const animatedMapContainerStyle = useAnimatedStyle(() => ({
    height: `${mapHeightPercent.value}%` as any,
  }));

  // Fallback coordinates
  const restLat = t?.restaurantLat ?? 28.6219;
  const restLng = t?.restaurantLng ?? 77.3879;
  const custLat = t?.customerLat ?? 28.6189;
  const custLng = t?.customerLng ?? 77.3915;

  const routeCoords: { latitude: number, longitude: number }[] = [];

  if (tracking.isLoading && !t) {
    return <LoadingView label="Loading tracking…" />;
  }

  if (tracking.isError && !t) {
    return (
      <View style={styles.safe}>
        <View style={styles.pad}>
          <ErrorView
            message={
              tracking.error instanceof Error
                ? tracking.error.message
                : 'Tracking unavailable'
            }
            onRetry={tracking.refetch}
          />
        </View>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Success Animation Overlay */}
      {showSuccessAnim && (
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <Animated.View style={[styles.successIconContainer, iconStyle]}>
              <CheckCircle2 color="#00A160" size={100} strokeWidth={2} />
            </Animated.View>

            <Animated.View style={[styles.successTextContainer, textStyle]}>
              <Text style={styles.successTitle}>Order Placed Successfully!</Text>
              <Text style={styles.successSubtitle}>
                Your delicious food is being prepared and will reach you soon.
              </Text>
            </Animated.View>
          </View>
        </View>
      )}

      {/* Top Half: Map Area */}
      <Animated.View style={[styles.mapContainer, { height: '55%' }]}>
        <WebView
          style={styles.map}
          source={{ html: generateMapHtml(routeCoords, restLat, restLng, custLat, custLng, o?.restaurantName || 'Restaurant', googleMapsApiKey) }}
          originWhitelist={['*']}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'ZOOM_CHANGED') {
                setIsZoomed(data.isZoomed);
              } else if (data.type === 'ROUTE_INFO') {
                setDistanceInfo({ dist: data.distance, time: data.duration });
              }
            } catch (e) { }
          }}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* Overlay Header */}
        <View style={styles.headerOverlay}>
          <Pressable style={styles.circleBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <ArrowLeft color="#1C1C1C" size={20} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{o?.restaurantName || 'The Waffle Co.'}</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {o?.items?.length || 1} items
            </Text>
          </View>

          <Pressable style={styles.circleBtn}>
            <MoreHorizontal color="#1C1C1C" size={20} />
          </Pressable>
        </View>

      </Animated.View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheetContainer}>
          <View style={styles.dragHandle} />
          
          <Text style={styles.deliveryStatusTitle}>Delivery Status</Text>
          <Text style={styles.deliveryStatusSub}>Food on the way</Text>
          
          <View style={styles.scooterImageContainer}>
            <Image 
              source={require('../../public/scooter.png')} 
              style={styles.scooterImage} 
              resizeMode="contain" 
            />
          </View>
          
          <View style={styles.trackerContainer}>
             <View style={styles.trackerBarBg} />
             <View style={[styles.trackerBarFill, { width: '68%' }]} />
             
             <View style={styles.trackerNodes}>
               <View style={styles.trackerNodeCol}>
                 <View style={styles.trackerDotActive}>
                   <View style={styles.trackerDotInner} />
                 </View>
                 <Text style={styles.trackerText}>Order{'\n'}Received</Text>
               </View>
               <View style={styles.trackerNodeCol}>
                 <View style={styles.trackerDotActive}>
                   <View style={styles.trackerDotInner} />
                 </View>
                 <Text style={styles.trackerText}>Headed{'\n'}to pickup</Text>
               </View>
               <View style={styles.trackerNodeCol}>
                 <View style={styles.trackerDotActiveLargeBg}>
                   <View style={styles.trackerDotActiveLarge} />
                 </View>
                 <Text style={styles.trackerText}>Food's on{'\n'}the way</Text>
               </View>
               <View style={styles.trackerNodeCol}>
                 <View style={styles.trackerDotInactive} />
                 <Text style={styles.trackerTextInactive}>Arriving{'\n'}soon</Text>
               </View>
             </View>
          </View>

          <Text style={styles.helpText}>
            Need help? <Text style={{ fontWeight: '700', color: '#1C1C1C' }}>Chat with pepper</Text>
          </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safe: { flex: 1, backgroundColor: '#FFF' },
  pad: { padding: 20 },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIconContainer: {
    marginBottom: 32,
    backgroundColor: '#D1FAE5',
    borderRadius: 100,
    padding: 24,
  },
  successTextContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1C',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  mapContainer: {
    width: '100%',
    position: 'relative',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  map: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  markerWrapper: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerIcon: {
    fontSize: 16,
  },
  markerLabel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1C',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    fontWeight: '500',
  },
  bottomSheetContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 100,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
  },
  deliveryStatusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 2,
  },
  deliveryStatusSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  scooterImageContainer: {
    height: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  scooterImage: {
    width: 220,
    height: 160,
  },
  trackerContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 24,
    position: 'relative',
    paddingHorizontal: 8,
  },
  trackerBarBg: {
    position: 'absolute',
    top: 14,
    left: 24,
    right: 24,
    height: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  trackerBarFill: {
    position: 'absolute',
    top: 14,
    left: 24,
    height: 20,
    backgroundColor: '#FF7D44',
    borderRadius: 10,
  },
  trackerNodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  trackerNodeCol: {
    alignItems: 'center',
    width: 70,
  },
  trackerDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF7D44',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginTop: 12,
  },
  trackerDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  trackerDotActiveLargeBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 125, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerDotActiveLarge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF7D44',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  trackerDotInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginTop: 12,
  },
  trackerText: {
    fontSize: 10,
    color: '#1C1C1C',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 12,
  },
  trackerTextInactive: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 12,
  },

  helpText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
});
